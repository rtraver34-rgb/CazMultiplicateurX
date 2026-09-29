// Netlify Function : paiement Telegram Stars
// Variables Netlify requises : BOT_TOKEN, WEBHOOK_SECRET

const PACKS = {
  s: { title: "100 étoiles", stars: 100, price: 50 },
  m: { title: "500 étoiles", stars: 500, price: 200 },
  l: { title: "1500 étoiles", stars: 1500, price: 500 },
};

const tg = (method, body) =>
  fetch(`https://api.telegram.org/bot${process.env.BOT_TOKEN}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).then((r) => r.json());

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...cors },
  });

export default async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });

  // 1) Le jeu demande un lien de facture : GET /api?pack=s
  if (req.method === "GET") {
    const id = new URL(req.url).searchParams.get("pack");
    const pack = PACKS[id];
    if (!pack) return json({ error: "pack inconnu" }, 400);

    const res = await tg("createInvoiceLink", {
      title: pack.title,
      description: `Achat de ${pack.title}`,
      payload: id,
      provider_token: "",
      currency: "XTR",
      prices: [{ label: pack.title, amount: pack.price }],
    });
    if (!res.ok) return json({ error: res.description }, 500);
    return json({ link: res.result, stars: pack.stars });
  }

  // 2) Telegram appelle le webhook : POST /api
  if (req.method === "POST") {
    if (req.headers.get("x-telegram-bot-api-secret-token") !== process.env.WEBHOOK_SECRET) {
      return new Response("forbidden", { status: 403 });
    }
    const update = await req.json();
    if (update.pre_checkout_query) {
      await tg("answerPreCheckoutQuery", {
        pre_checkout_query_id: update.pre_checkout_query.id,
        ok: true,
      });
    }
    return new Response("ok");
  }

  return new Response("method not allowed", { status: 405 });
};

export const config = { path: "/api" };
