'use server';

import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const stripeSecret = process.env.STRIPE_SECRET_KEY;
const stripe = stripeSecret ? new Stripe(stripeSecret, { apiVersion: "2025-11-17.clover" }) : null;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin =
  supabaseUrl && serviceRoleKey ? createClient(supabaseUrl, serviceRoleKey) : null;

export async function POST(request: Request) {
  if (!stripe) {
    return NextResponse.json(
      { error: "Stripeの秘密鍵が設定されていません。" },
      { status: 500 },
    );
  }
  if (!supabaseAdmin) {
    return NextResponse.json(
      { error: "Supabaseサービスロールキーが未設定です。" },
      { status: 500 },
    );
  }

  const { sessionId, userId } = await request.json().catch(() => ({ sessionId: null, userId: null }));
  if (!sessionId || !userId) {
    return NextResponse.json({ error: "セッション情報が不足しています。" }, { status: 400 });
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (!session) {
      throw new Error("セッションが見つかりません。");
    }

    if (session.metadata?.user_id !== userId) {
      return NextResponse.json(
        { error: "ユーザーIDが決済セッションと一致しません。" },
        { status: 400 },
      );
    }

    if (session.payment_status !== "paid") {
      return NextResponse.json(
        { error: "決済が完了していません。サポートへお問い合わせください。" },
        { status: 400 },
      );
    }

    const purchasedAt = new Date((session.created ?? Date.now() / 1000) * 1000).toISOString();
    const amount = session.amount_total ?? 0;
    const currency = session.currency ?? "jpy";

    const { error } = await supabaseAdmin
      .from("user_payments")
      .upsert(
        {
          user_id: userId,
          stripe_session_id: session.id,
          status: session.payment_status,
          plan: session.metadata?.plan ?? "premium",
          amount,
          currency,
          purchased_at: purchasedAt,
        },
        { onConflict: "stripe_session_id" },
      );

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Stripe confirmation failed", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "決済記録の保存に失敗しました。" },
      { status: 500 },
    );
  }
}
