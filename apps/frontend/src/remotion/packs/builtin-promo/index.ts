/**
 * builtin-promo pack — default promotional components shipped with VibeCut.
 *
 * Export names here become the keys in the pack registry:
 *   - "builtin-promo/OfferStage"
 *   - "builtin-promo/PromoTopBar"
 *   - etc.
 *
 * We also export with legacy component_type names as aliases so existing
 * timelines continue to work without modification.
 */

export { OfferStage } from './OfferStage';
export { PromoTopBar } from './PromoTopBar';
export { PriceBadge, ReactionSticker } from './PriceBadge';
export { CountdownBanner } from './CountdownBanner';
export { ModelRateGrid } from './ModelRateGrid';
export { CtaBadge } from './CtaBadge';

// Legacy aliases matching the old component_type values:
export { OfferStage as offer_stage } from './OfferStage';
export { OfferStage as pricing_stage } from './OfferStage';
export { OfferStage as proof_stage } from './OfferStage';
export { PromoTopBar as promo_top_bar } from './PromoTopBar';
export { PriceBadge as price_badge } from './PriceBadge';
export { PriceBadge as reaction_sticker } from './PriceBadge';
export { CountdownBanner as countdown_banner } from './CountdownBanner';
export { ModelRateGrid as model_rate_grid } from './ModelRateGrid';
export { CtaBadge as cta_badge } from './CtaBadge';
