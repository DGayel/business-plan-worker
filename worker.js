/**
 * Cloudflare Worker — Anthropic API Proxy
 * 
 * This worker sits between your HTML frontend and the Anthropic API.
 * It keeps your API key secure (stored as a Cloudflare secret, never in your HTML).
 * 
 * SETUP INSTRUCTIONS:
 * 1. Go to workers.cloudflare.com and create a free account
 * 2. Click "Create Application" → "Create Worker"
 * 3. Delete the default code and paste this entire file
 * 4. Click "Save and Deploy"
 * 5. Go to Settings → Variables → Add variable:
 *    Name: ANTHROPIC_API_KEY
 *    Value: your Anthropic API key (from console.anthropic.com)
 *    Click "Encrypt" to keep it secret
 * 6. Copy your Worker URL (looks like: https://your-worker.your-name.workers.dev)
 * 7. Paste that URL into your HTML file where it says YOUR_WORKER_URL_HERE
 */

export default {
  async fetch(request, env) {

    // ── CORS: allow requests from any origin (your Netlify site) ──
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    // Handle preflight OPTIONS request
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    // Only accept POST requests
    if (request.method !== "POST") {
      return new Response("Method not allowed", { status: 405, headers: corsHeaders });
    }

    // Parse the incoming request body
    let body;
    try {
      body = await request.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Validate required fields
    if (!body.messages || !Array.isArray(body.messages)) {
      return new Response(JSON.stringify({ error: "Missing messages array" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Call Anthropic API using the secret key stored in Cloudflare
    try {
      const anthropicResponse = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": env.ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 4000,
          messages: body.messages,
        }),
      });

      const data = await anthropicResponse.json();

      // Return the Anthropic response to your frontend
      return new Response(JSON.stringify(data), {
        status: anthropicResponse.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });

    } catch (error) {
      return new Response(JSON.stringify({ error: "Failed to reach Anthropic API", detail: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
  }
};
