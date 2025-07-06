const cache = new Map();
const CACHE_TTL_MS = 1000 * 60 * 60; // 1 hour

// relayer.js
require("dotenv").config();
const ethers = require("ethers");
const axios  = require("axios");

////////////////////////////////////////////////////////////////////////////////
// 1) Load configuration from .env
////////////////////////////////////////////////////////////////////////////////
const {
  ALCHEMY_URL,
  WALRUS_GATEWAY_URL,
  RELAYER_PRIVATE_KEY,
  FACTCHECK_CONTRACT,
  BROKER_URL,
  DEEPSEEK_PROVIDER,
  SERPAPI_KEY,
  NUM_RESULTS = "5"
} = process.env;

if (!ALCHEMY_URL || !RELAYER_PRIVATE_KEY || !FACTCHECK_CONTRACT || !WALRUS_GATEWAY_URL) {
  console.error("❌ Missing ALCHEMY_URL, RELAYER_PRIVATE_KEY, FACTCHECK_CONTRACT, or WALRUS_GATEWAY_URL");
  process.exit(1);
}

////////////////////////////////////////////////////////////////////////////////
// 2) Setup ethers.js
////////////////////////////////////////////////////////////////////////////////
const provider = new ethers.providers.JsonRpcProvider(ALCHEMY_URL);
const wallet   = new ethers.Wallet(RELAYER_PRIVATE_KEY, provider);

// Separate read‐only vs write contracts
const abi = [
  "event FactCheckRequested(uint256 indexed requestId, address indexed requester, string claim)",
  "function fulfillFactCheck(uint256 requestId, string verdict, string explanation) external"
];
const readContract  = new ethers.Contract(FACTCHECK_CONTRACT, abi, provider);
const writeContract = readContract.connect(wallet);

////////////////////////////////////////////////////////////////////////////////
// 3) Helper: fetch total results count from SerpAPI
////////////////////////////////////////////////////////////////////////////////
async function fetchTotalResults(claim) {
  const resp = await axios.get("https://serpapi.com/search", {
    params: {
      engine:  "google",
      q:       claim,
      api_key: SERPAPI_KEY,
      num:     parseInt(NUM_RESULTS, 10)
    }
  });
  if (resp.status !== 200) {
    throw new Error(`SerpAPI error: ${resp.statusText}`);
  }
  const total = resp.data.search_information?.total_results;
  if (total == null) {
    throw new Error("Could not read total_results from SerpAPI response");
  }
  return total;
}


async function fetchArticleByHash(uri) {
 // uri is just the content identifier 
  const url = `${WALRUS_GATEWAY_URL}/${uri}`;
  const resp = await axios.get(url, { responseType: "text" });
  if (resp.status !== 200) {
    throw new Error(`Failed to fetch article from Walrus: ${resp.status}`);
  }
  return resp.data;
}


////////////////////////////////////////////////////////////////////////////////
// 6) Helper: compute journalist bias score for full article
////////////////////////////////////////////////////////////////////////////////
async function computeBiasScore(article) {
  const prompt = `
You are given the following article. Assess the journalist's bias on a scale of 0% (completely objective) to 100% (highly biased).
Respond ONLY with valid JSON in this format:
{'bias_score': <number%>}

Article:
"""${article}"""
  `.trim();

  const resp = await axios.post(BROKER_URL, {
    providerAddress: DEEPSEEK_PROVIDER,
    query:           prompt,
    fallbackFee:     0.01
  });
  const content = resp.data.response?.content;
  if (!content) throw new Error("No content in DeepSeek response for computeBiasScore");
  const m = content.match(/\{[^}]*\}/s);
  if (!m) throw new Error("No JSON object found in computeBiasScore response");
  const jsonString   = m[0].replace(/'/g, `\"`).replace(/%/g, "").trim();
  const parsed       = JSON.parse(jsonString);
  const rawBias      = parsed.bias_score;
  const biasScore    = String(rawBias).endsWith("%") ? String(rawBias) : `${rawBias}%`;
  console.log(`    Parsed bias_score = ${biasScore}`);
  return biasScore;
}

////////////////////////////////////////////////////////////////////////////////
// 4) Handler: on each request, call SerpAPI + DeepSeek + on-chain
////////////////////////////////////////////////////////////////////////////////

async function extractClaims(article) {
  const prompt = `
You are given the following article. 
Remove all the irrelevant informations and only keep subject related informations.
Extract each factual assertion made in it as a separate claim.
Return at MOST top 1 claim made by the journalist.
Respond ONLY with valid JSON in the format: 
{"claims": ["<claim1>", "<claim2>", ...]}

Article:
"""${article}"""
  `.trim();
  const resp = await axios.post(BROKER_URL, {
    providerAddress: DEEPSEEK_PROVIDER,
    query:           prompt,
    fallbackFee:     0.01,
    chainRpcUrl:     ALCHEMY_URL 
  });
  console.log("BROKER", DEEPSEEK_PROVIDER)
  console.log("BROKER", BROKER_URL)
    // 3) Try the two known shapes
  let content =
    resp.data.response?.content ||  // new style
    resp.data.result      ||        // old style
    "";

  if (typeof content !== "string" || !content.trim()) {
    throw new Error("extractClaims: No content found in broker response");
  }

  // pull out JSON object
  const m = content.match(/\{[\s\S]*\}/);
  if (!m) throw new Error("No JSON object found in extractClaims response");
  const obj = JSON.parse(m[0]);
  if (!Array.isArray(obj.claims)) {
    throw new Error("extractClaims JSON missing `claims` array");
  }
  return obj.claims;
}

async function scoreClaim(claim, totalResults) {

// Build DeepSeek prompt
  const prompt = `
                Context:
                Google search for "${claim}" returned approximately ${totalResults.toLocaleString()} results.

                Claim:
                ${claim}

                Respond ONLY with a valid JSON with this format:
                {'Fact_score': <number%>}
                `.trim();

  //Send to 0G broker
  const brokerResp = await axios.post(BROKER_URL, {
    providerAddress: DEEPSEEK_PROVIDER,
    query:           prompt,
    fallbackFee:     0.01
  });

  const raw = brokerResp.data;
  if (!raw.success || !raw.response || typeof raw.response.content !== "string") {
    console.error("    Unexpected broker response:", JSON.stringify(raw, null, 2));
    throw new Error("Bad broker response format");
  }
  const resultText = raw.response.content;
  console.log(`    DeepSeek model raw content:`, JSON.stringify(resultText));

  // 4d) Extract and normalize JSON snippet, strip '%' for parsing
  const match = resultText.match(/\{[^}]*\}/s);
  if (!match) {
    console.error("    No JSON object found in:", resultText);
    throw new Error("No JSON found in DeepSeek response");
  }

  // e.g. "{'Fact_score': 95%}"
  const jsonString = match[0].replace(/'/g, `"`).trim();
  const jsonForParse = jsonString.replace(/%/g, "");
  // 4e) Parse and reattach '%'
  let factScoreRaw;
  try {
    const parsed = JSON.parse(jsonForParse);
    factScoreRaw = parsed.Fact_score;
    if (typeof factScoreRaw !== "number" && typeof factScoreRaw !== "string") {
      throw new Error("Fact_score missing or invalid");
    }
  } catch (e) {
    console.error("    JSON parse failed. jsonString was:", jsonString);
    throw new Error(`Invalid JSON from DeepSeek: ${e.message}`);
  }
  const factScore = String(factScoreRaw).endsWith("%")
    ? String(factScoreRaw)
    : `${factScoreRaw}%`;

  console.log(`    Parsed Fact_score = ${factScore}`);
  return factScore;
}

////////////////////////////////////////////////////////////////////////////////
// 5) Start listening
////////////////////////////////////////////////////////////////////////////////

async function handleArticle(requestId, requester, uri) {
  console.log(`→ [${requestId.toString()}] Received uri ${uri}`);

  // fetch the article

  const article = await fetchArticleByHash(uri)
  console.log(`    → Fetched article (${article.length} chars) from Walrus`);

  // 4a) Break article into claims
  const claims = await extractClaims(article);
  console.log(`    → Extracted ${claims.length} claims`);

  // 4b) Score each claim
  const scored = [];
  for (const claim of claims) {
    console.log(`    • Scoring: "${claim}"`);
    const total = await fetchTotalResults(claim);
    const score = await scoreClaim(claim, total);
    console.log(`      → ${score}`);
    scored.push({ claim, score });
  }

  // 4c) Compute overall average
  const nums = scored.map(c => parseFloat(c.score));
  const avg  = nums.reduce((a, b) => a + b, 0) / nums.length || 0;
  const overallScore = `${avg.toFixed(2)}%`;
  console.log(`    ✨ Overall score: ${overallScore}`);

  // Compute bias score
  const biasScore = await computeBiasScore(article);
  console.log(`    📰 Journalist bias score: ${biasScore}`);
  
  // 4d) Build the JSON payload
  const payload = JSON.stringify({
    claims: scored,
    overallScore,
    biasScore
  });

  // 4e) Write back on‐chain: verdict = overallScore, explanation = full JSON
  const tx = await writeContract.fulfillFactCheck(
    requestId.toString(),
    overallScore,
    payload
  );
  await tx.wait();
  console.log(`✔ Fulfill tx sent: ${tx.hash}`);
}

////////////////////////////////////////////////////////////////////////////////
// 5) Listen for Article requests
////////////////////////////////////////////////////////////////////////////////
console.log("🍃 Relayer listening for FactCheckRequested(uri) …");
readContract.on("FactCheckRequested", (id, requester, uri) => {
  handleArticle(id, requester, uri).catch(err => {
    console.error(`✖ Error on ${id.toString()}:`, err);
  });
});

module.exports = { handleArticle };

//172.31.49.157