'use server';

import { NextResponse } from "next/server";
import Stripe from "stripe";

const stripeSecret = process.env.STRIPE_SECRET_KEY;
const stripePriceId = process.env.STRIPE_PRICE_ID;

const stripe = stripeSecret ? new Stripe(stripeSecret, { apiVersion: "2025-11-17.clover" }) : null;

export async function POST(request: Request) {
  if (!stripe || !stripePriceId) {
    return NextResponse.json(
      { error: "Stripeの環境変数(STRIPE_SECRET_KEY / STRIPE_PRICE_ID)が未設定です。" },
      { status: 500 },
    );
  }

  const { userId, email } = await request.json().catch(() => ({ userId: null, email: null }));
  if (!userId || !email) {
    return NextResponse.json({ error: "ユーザー情報が不足しています。" }, { status: 400 });
  }

  const origin = request.headers.get("origin") ?? process.env.NEXT_PUBLIC_SITE_URL;
  if (!origin) {
    return NextResponse.json(
      { error: "サイトURLが不明です。NEXT_PUBLIC_SITE_URL を設定してください。" },
      { status: 500 },
    );
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: email,
      metadata: {
        user_id: userId,
        plan: "premium",
      },
      line_items: [{ price: stripePriceId, quantity: 1 }],
      success_url: `${origin}/premium/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}#premium`,
    });

    if (!session.url) {
      throw new Error("StripeセッションURLの生成に失敗しました。");
    }

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Stripe checkout creation failed", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "決済セッションの作成に失敗しました。時間をおいて再試行してください。",
      },
      { status: 500 },
    );
  }
}
