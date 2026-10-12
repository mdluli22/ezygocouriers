import type { PoolClient } from "pg";
import { BusinessError } from "@/lib/api/errors";

export interface QuoteResult {
  quoteId: number;
  amount: number;
  currency: string;
  pricingRuleId: number;
  ruleName: string;
}

/**
 * Generate a quote for a delivery.
 * For MVP, this fetches the active flat fee from the pricing_rules table.
 * The amount is stored in the DB so the admin can update it without a deploy.
 */
export async function generateQuote(client: PoolClient): Promise<QuoteResult> {
  // 1. Fetch the active pricing rule
  const ruleResult = await client.query<{
    id: number;
    rule_name: string;
    flat_fee: string;
    currency: string;
  }>(
    `SELECT id, rule_name, flat_fee, currency
     FROM pricing_rules
     WHERE is_active = TRUE
     ORDER BY id ASC
     LIMIT 1`
  );

  if (!ruleResult.rows.length) {
    throw new Error("No active pricing rule found.");
  }

  const rule = ruleResult.rows[0];
  const amount = parseFloat(rule.flat_fee);

  // 2. Insert a quote record
  const quoteResult = await client.query<{ id: number }>(
    `INSERT INTO quotes (pricing_rule_id, amount, currency, status, expires_at)
     VALUES ($1, $2, $3, 'pending', NOW() + INTERVAL '30 minutes')
     RETURNING id`,
    [rule.id, amount, rule.currency]
  );

  return {
    quoteId:      quoteResult.rows[0].id,
    amount,
    currency:     rule.currency,
    pricingRuleId: rule.id,
    ruleName:     rule.rule_name,
  };
}

/**
 * Accept a quote, moves its status to 'accepted'.
 */
export async function acceptQuote(client: PoolClient, quoteId: number): Promise<void> {
  const result = await client.query(`UPDATE quotes SET status='accepted',updated_at=NOW()
    WHERE id=$1 AND (status='accepted' OR (status='pending' AND expires_at>NOW())) RETURNING id`, [quoteId]);
  if (!result.rowCount) throw new BusinessError("This quote has expired. Please start a new booking.");
}
