/**
 * Smart Auto-Categorization utility
 *
 * Provides a tiered keyword-matching approach to suggest budget categories for
 * vendor names extracted from a bank CSV. Works fully client-side with zero
 * external API calls.
 *
 * Confidence levels:
 *   'high'   – exact or strong keyword match (show green badge, pre-select)
 *   'medium' – partial/substring keyword match (show amber badge, pre-select but flag)
 *   'low'    – fuzzy match against user's existing category names only
 *   null     – no suggestion found
 *
 * Category keys are canonical English strings that are then matched against the
 * user's actual category names at call-time (case-insensitive, substring match).
 * This means the dictionary never hard-codes category IDs.
 */

// ─── Canonical category vocabulary ───────────────────────────────────────────
//
// These strings should be broad enough to match against typical category names
// users create (e.g. "Groceries", "Groceries & Household", "Food & Groceries").
// Listed most-specific first within each vendor rule so the first match wins.

export type AutoCatConfidence = 'high' | 'medium' | 'low';

export interface AutoCatSuggestion {
    /** Canonical category keyword to look up in the user's categories */
    categoryKeyword: string;
    /** Group keyword for creating the category if it doesn't exist */
    groupKeyword: string;
    confidence: AutoCatConfidence;
    /** Human-readable reason shown in the UI */
    reason: string;
}

// ─── Keyword rules ────────────────────────────────────────────────────────────
// Each rule: [vendorPattern (regex source), categoryKeyword, groupKeyword]
// Patterns are matched against the *normalised* vendor string.

type Rule = [string, string, string];

const HIGH_CONFIDENCE_RULES: Rule[] = [
    // ── Groceries ──
    ['\\btesco\\b', 'Groceries', 'Daily Essentials'],
    ['\\bsainsbury', 'Groceries', 'Daily Essentials'],
    ['\\basda\\b', 'Groceries', 'Daily Essentials'],
    ['\\bmorrisons\\b', 'Groceries', 'Daily Essentials'],
    ['\\bwaitrose\\b', 'Groceries', 'Daily Essentials'],
    ['\\bmarks.*spencer|m&s food|ms food\\b', 'Groceries', 'Daily Essentials'],
    ['\\bco-?op\\b', 'Groceries', 'Daily Essentials'],
    ['\\baldi\\b', 'Groceries', 'Daily Essentials'],
    ['\\blidl\\b', 'Groceries', 'Daily Essentials'],
    ['\\bicelan(d|ics)\\b', 'Groceries', 'Daily Essentials'],
    ['\\bwhole foods\\b', 'Groceries', 'Daily Essentials'],
    ['\\btrader joe', 'Groceries', 'Daily Essentials'],
    ['\\bkroger\\b', 'Groceries', 'Daily Essentials'],
    ['\\bpublix\\b', 'Groceries', 'Daily Essentials'],
    ['\\bwegman', 'Groceries', 'Daily Essentials'],
    ['\\bcostco\\b', 'Groceries', 'Daily Essentials'],
    ['\\bsam.?s club\\b', 'Groceries', 'Daily Essentials'],
    ['\\bwal.?mart\\b', 'Groceries', 'Daily Essentials'],
    ['\\bspar\\b', 'Groceries', 'Daily Essentials'],
    ['\\bnetto\\b', 'Groceries', 'Daily Essentials'],
    ['\\bbiedronka\\b', 'Groceries', 'Daily Essentials'],
    ['\\bcarrefour\\b', 'Groceries', 'Daily Essentials'],
    ['\\bledermacher\\b', 'Groceries', 'Daily Essentials'],
    ['\\bfarm foods\\b', 'Groceries', 'Daily Essentials'],
    ['\\bocado\\b', 'Groceries', 'Daily Essentials'],

    // ── Eating out / restaurants ──
    ['\\bmcdonald', 'Dining Out', 'Going Out & Lifestyle'],
    ['\\bkfc\\b', 'Dining Out', 'Going Out & Lifestyle'],
    ['\\bburger king\\b', 'Dining Out', 'Going Out & Lifestyle'],
    ['\\bsubway\\b', 'Dining Out', 'Going Out & Lifestyle'],
    ['\\bpizza hut\\b', 'Dining Out', 'Going Out & Lifestyle'],
    ['\\bdominos|domino.?s\\b', 'Dining Out', 'Going Out & Lifestyle'],
    ['\\bnando.?s|nandos\\b', 'Dining Out', 'Going Out & Lifestyle'],
    ['\\bgreggs\\b', 'Dining Out', 'Going Out & Lifestyle'],
    ['\\bpret a manger|pret\\b', 'Dining Out', 'Going Out & Lifestyle'],
    ['\\bwetherspoon|j d wetherspoon\\b', 'Dining Out', 'Going Out & Lifestyle'],
    ['\\bjust.?eat\\b', 'Dining Out', 'Going Out & Lifestyle'],
    ['\\buber eats\\b', 'Dining Out', 'Going Out & Lifestyle'],
    ['\\bdeliveroo\\b', 'Dining Out', 'Going Out & Lifestyle'],
    ['\\bdoor.?dash\\b', 'Dining Out', 'Going Out & Lifestyle'],
    ['\\bgrubhub\\b', 'Dining Out', 'Going Out & Lifestyle'],
    ['\\bchipotle\\b', 'Dining Out', 'Going Out & Lifestyle'],
    ['\\bstarbucks\\b', 'Dining Out', 'Going Out & Lifestyle'],
    ['\\bcosta coffee|costa\\b', 'Dining Out', 'Going Out & Lifestyle'],
    ['\\bnero|caffe nero\\b', 'Dining Out', 'Going Out & Lifestyle'],
    ['\\bwagamama\\b', 'Dining Out', 'Going Out & Lifestyle'],
    ['\\bpizzaexpress|pizza express\\b', 'Dining Out', 'Going Out & Lifestyle'],
    ['\\boliver.?s\\b', 'Dining Out', 'Going Out & Lifestyle'],
    ['\\btim hortons\\b', 'Dining Out', 'Going Out & Lifestyle'],
    ['\\bpanera\\b', 'Dining Out', 'Going Out & Lifestyle'],
    ['\\bfive guys\\b', 'Dining Out', 'Going Out & Lifestyle'],
    ['\\bshake shack\\b', 'Dining Out', 'Going Out & Lifestyle'],

    // ── Transport ──
    ['\\btfl\\b|transport for london', 'Transport', 'Daily Essentials'],
    ['\\boyster\\b', 'Transport', 'Daily Essentials'],
    ['\\bnational rail\\b', 'Transport', 'Daily Essentials'],
    ['\\btrainline\\b', 'Transport', 'Daily Essentials'],
    ['\\bavanti\\b', 'Transport', 'Daily Essentials'],
    ['\\bgwr|great western\\b', 'Transport', 'Daily Essentials'],
    ['\\bthameslink\\b', 'Transport', 'Daily Essentials'],
    ['\\bcrossrail\\b', 'Transport', 'Daily Essentials'],
    ['\\bnational express\\b', 'Transport', 'Daily Essentials'],
    ['\\bmegabus\\b', 'Transport', 'Daily Essentials'],
    ['\\buber\\b', 'Transport', 'Daily Essentials'],
    ['\\blyft\\b', 'Transport', 'Daily Essentials'],
    ['\\bbolt\\b', 'Transport', 'Daily Essentials'],
    ['\\bfreebird\\b', 'Transport', 'Daily Essentials'],
    ['\\bflixbus\\b', 'Transport', 'Daily Essentials'],
    ['\\beasyjet\\b', 'Transport', 'Daily Essentials'],
    ['\\bryanair\\b', 'Transport', 'Daily Essentials'],
    ['\\bba\\b|british airways\\b', 'Transport', 'Daily Essentials'],
    ['\\bdelta\\b', 'Transport', 'Daily Essentials'],
    ['\\bamerica(n)? airlines\\b', 'Transport', 'Daily Essentials'],
    ['\\bunited airlines\\b', 'Transport', 'Daily Essentials'],
    ['\\beuro.?car parks|\\bncp\\b', 'Transport', 'Daily Essentials'],

    // ── Fuel ──
    ['\\bbp\\b|british petrol', 'Fuel', 'Daily Essentials'],
    ['\\bshell\\b', 'Fuel', 'Daily Essentials'],
    ['\\besso\\b', 'Fuel', 'Daily Essentials'],
    ['\\btexaco\\b', 'Fuel', 'Daily Essentials'],
    ['\\bmobil\\b', 'Fuel', 'Daily Essentials'],
    ['\\bjet petrol\\b', 'Fuel', 'Daily Essentials'],
    ['\\bsainsbury.?s petrol\\b', 'Fuel', 'Daily Essentials'],
    ['\\btesco petrol\\b', 'Fuel', 'Daily Essentials'],
    ['\\bwm morrison petrol\\b', 'Fuel', 'Daily Essentials'],

    // ── Subscriptions / Streaming ──
    ['\\bnetflix\\b', 'Subscriptions', 'Going Out & Lifestyle'],
    ['\\bspotify\\b', 'Subscriptions', 'Going Out & Lifestyle'],
    ['\\bdisney\\+|disney plus\\b', 'Subscriptions', 'Going Out & Lifestyle'],
    ['\\bamazon prime\\b', 'Subscriptions', 'Going Out & Lifestyle'],
    ['\\bapple (music|tv|one|arcade|icloud|storage)\\b', 'Subscriptions', 'Going Out & Lifestyle'],
    ['\\bgoogle (one|storage|play pass)\\b', 'Subscriptions', 'Going Out & Lifestyle'],
    ['\\byoutube premium\\b', 'Subscriptions', 'Going Out & Lifestyle'],
    ['\\bhbo\\b', 'Subscriptions', 'Going Out & Lifestyle'],
    ['\\bparamount\\+|paramount plus\\b', 'Subscriptions', 'Going Out & Lifestyle'],
    ['\\bprime video\\b', 'Subscriptions', 'Going Out & Lifestyle'],
    ['\\bdeezer\\b', 'Subscriptions', 'Going Out & Lifestyle'],
    ['\\btidal\\b', 'Subscriptions', 'Going Out & Lifestyle'],
    ['\\btwitch\\b', 'Subscriptions', 'Going Out & Lifestyle'],
    ['\\bdropbox\\b', 'Subscriptions', 'Going Out & Lifestyle'],
    ['\\bnotion\\b', 'Subscriptions', 'Going Out & Lifestyle'],
    ['\\bslack\\b', 'Subscriptions', 'Going Out & Lifestyle'],
    ['\\bcheckout.com\\b', 'Subscriptions', 'Going Out & Lifestyle'],
    ['\\badobeadobe|adobe (creative|photoshop|acrobat)\\b', 'Subscriptions', 'Going Out & Lifestyle'],
    ['\\bmicrosoft 365|office 365\\b', 'Subscriptions', 'Going Out & Lifestyle'],

    // ── Utilities ──
    ['\\bbritish gas\\b', 'Energy & Utilities', 'Housing & Bills'],
    ['\\be.?on\\b', 'Energy & Utilities', 'Housing & Bills'],
    ['\\boctopus energy\\b', 'Energy & Utilities', 'Housing & Bills'],
    ['\\bbulb\\b', 'Energy & Utilities', 'Housing & Bills'],
    ['\\bsso energy\\b', 'Energy & Utilities', 'Housing & Bills'],
    ['\\bscottish power\\b', 'Energy & Utilities', 'Housing & Bills'],
    ['\\bnpower\\b', 'Energy & Utilities', 'Housing & Bills'],
    ['\\bev.?onik\\b', 'Energy & Utilities', 'Housing & Bills'],
    ['\\bwater (bill|services|plus)\\b', 'Energy & Utilities', 'Housing & Bills'],
    ['\\bthames water\\b', 'Energy & Utilities', 'Housing & Bills'],
    ['\\bsevern trent\\b', 'Energy & Utilities', 'Housing & Bills'],
    ['\\bconedison|con ed\\b', 'Energy & Utilities', 'Housing & Bills'],
    ['\\bpg&e|pacific gas\\b', 'Energy & Utilities', 'Housing & Bills'],

    // ── Internet / Phone ──
    ['\\bbt\\b|british telecom', 'Internet & Phone', 'Housing & Bills'],
    ['\\bvirgin media\\b', 'Internet & Phone', 'Housing & Bills'],
    ['\\bsky\\b', 'Internet & Phone', 'Housing & Bills'],
    ['\\btalktalk\\b', 'Internet & Phone', 'Housing & Bills'],
    ['\\bvoda(fone)?\\b', 'Internet & Phone', 'Housing & Bills'],
    ['\\bthree\\b', 'Internet & Phone', 'Housing & Bills'],
    ['\\bo2\\b', 'Internet & Phone', 'Housing & Bills'],
    ['\\bee\\b', 'Internet & Phone', 'Housing & Bills'],
    ['\\bgiffgaff\\b', 'Internet & Phone', 'Housing & Bills'],
    ['\\bsmartphone|mobil(e )?contract\\b', 'Internet & Phone', 'Housing & Bills'],
    ['\\bcomcast\\b', 'Internet & Phone', 'Housing & Bills'],
    ['\\bxfinity\\b', 'Internet & Phone', 'Housing & Bills'],
    ['\\bverizon\\b', 'Internet & Phone', 'Housing & Bills'],
    ['\\bat&t\\b', 'Internet & Phone', 'Housing & Bills'],
    ['\\bt-mobile\\b', 'Internet & Phone', 'Housing & Bills'],
    ['\\bsprint\\b', 'Internet & Phone', 'Housing & Bills'],

    // ── Health & Gym ──
    ['\\bpure gym\\b', 'Gym & Wellness', 'Going Out & Lifestyle'],
    ['\\bplanet fitness\\b', 'Gym & Wellness', 'Going Out & Lifestyle'],
    ['\\bdavid lloyd\\b', 'Gym & Wellness', 'Going Out & Lifestyle'],
    ['\\bvirgin active\\b', 'Gym & Wellness', 'Going Out & Lifestyle'],
    ['\\bjd gym\\b|jd gyms\\b', 'Gym & Wellness', 'Going Out & Lifestyle'],
    ['\\bthe gym\\b', 'Gym & Wellness', 'Going Out & Lifestyle'],
    ['\\banytime fitness\\b', 'Gym & Wellness', 'Going Out & Lifestyle'],
    ['\\b24 hour fitness\\b', 'Gym & Wellness', 'Going Out & Lifestyle'],
    ['\\bnhs prescriptions\\b', 'Health', 'Daily Essentials'],
    ['\\bboots pharmacy\\b', 'Health', 'Daily Essentials'],
    ['\\blloyds pharmacy\\b', 'Health', 'Daily Essentials'],
    ['\\bcvs\\b', 'Health', 'Daily Essentials'],
    ['\\bwalgreens\\b', 'Health', 'Daily Essentials'],
    ['\\brite aid\\b', 'Health', 'Daily Essentials'],

    // ── Shopping / Clothing ──
    ['\\bamazon\\b', 'Shopping', 'Going Out & Lifestyle'],
    ['\\bebay\\b', 'Shopping', 'Going Out & Lifestyle'],
    ['\\basos\\b', 'Clothing', 'Going Out & Lifestyle'],
    ['\\bnext\\b', 'Clothing', 'Going Out & Lifestyle'],
    ['\\bprimark\\b', 'Clothing', 'Going Out & Lifestyle'],
    ['\\bh&m\\b', 'Clothing', 'Going Out & Lifestyle'],
    ['\\bzara\\b', 'Clothing', 'Going Out & Lifestyle'],
    ['\\buniqlo\\b', 'Clothing', 'Going Out & Lifestyle'],
    ['\\btk maxx\\b', 'Clothing', 'Going Out & Lifestyle'],
    ['\\bnike\\b', 'Clothing', 'Going Out & Lifestyle'],
    ['\\badidas\\b', 'Clothing', 'Going Out & Lifestyle'],
    ['\\bjd sports\\b', 'Clothing', 'Going Out & Lifestyle'],
    ['\\bfootlocker\\b', 'Clothing', 'Going Out & Lifestyle'],
    ['\\briver island\\b', 'Clothing', 'Going Out & Lifestyle'],
    ['\\btopshop\\b', 'Clothing', 'Going Out & Lifestyle'],
    ['\\bboohoo\\b', 'Clothing', 'Going Out & Lifestyle'],
    ['\\bprettylit(tle)?thing\\b', 'Clothing', 'Going Out & Lifestyle'],
    ['\\bshein\\b', 'Clothing', 'Going Out & Lifestyle'],
    ['\\bmacy.?s\\b', 'Clothing', 'Going Out & Lifestyle'],

    // ── Entertainment ──
    ['\\bcinema|cineworld|odeon|vue cinema\\b', 'Entertainment', 'Going Out & Lifestyle'],
    ['\\bsteam\\b', 'Entertainment', 'Going Out & Lifestyle'],
    ['\\bepic games\\b', 'Entertainment', 'Going Out & Lifestyle'],
    ['\\bpsn|playstation network\\b', 'Entertainment', 'Going Out & Lifestyle'],
    ['\\bxbox|microsoft games\\b', 'Entertainment', 'Going Out & Lifestyle'],
    ['\\bnintendo\\b', 'Entertainment', 'Going Out & Lifestyle'],
    ['\\bticketmaster\\b', 'Entertainment', 'Going Out & Lifestyle'],
    ['\\bsee tickets\\b', 'Entertainment', 'Going Out & Lifestyle'],
    ['\\bsky ticket\\b', 'Entertainment', 'Going Out & Lifestyle'],

    // ── Savings / Investments ──
    ['\\bvanguard\\b', 'Investments', 'Savings & Investments'],
    ['\\bfidelity\\b', 'Investments', 'Savings & Investments'],
    ['\\bfreetrade\\b', 'Investments', 'Savings & Investments'],
    ['\\btrading 212\\b', 'Investments', 'Savings & Investments'],
    ['\\bnutmeg\\b', 'Investments', 'Savings & Investments'],
    ['\\bmoneyfarm\\b', 'Investments', 'Savings & Investments'],
    ['\\bcoin.?base\\b', 'Investments', 'Savings & Investments'],
    ['\\bbinance\\b', 'Investments', 'Savings & Investments'],
    ['\\bkraken\\b', 'Investments', 'Savings & Investments'],
    ['\\betoro\\b', 'Investments', 'Savings & Investments'],

    // ── Insurance ──
    ['\\bcompare the market\\b', 'Insurance', 'Housing & Bills'],
    ['\\bmoneysupermarket\\b', 'Insurance', 'Housing & Bills'],
    ['\\baviva\\b', 'Insurance', 'Housing & Bills'],
    ['\\baxa\\b', 'Insurance', 'Housing & Bills'],
    ['\\bdirect line\\b', 'Insurance', 'Housing & Bills'],
    ['\\badmiral\\b', 'Insurance', 'Housing & Bills'],
    ['\\bchurchill\\b', 'Insurance', 'Housing & Bills'],
    ['\\bgeico\\b', 'Insurance', 'Housing & Bills'],
    ['\\bstate farm\\b', 'Insurance', 'Housing & Bills'],
    ['\\ballstate\\b', 'Insurance', 'Housing & Bills'],

    // ── Charity / Donations ──
    ['\\bjust giving|justgiving\\b', 'Charity & Donations', 'Savings & Future'],
    ['\\bgofundme\\b', 'Charity & Donations', 'Savings & Future'],
    ['\\bcharit(y|ies)\\b', 'Charity & Donations', 'Savings & Future'],
    ['\\bpatreon\\b', 'Charity & Donations', 'Savings & Future'],

    // ── Education ──
    ['\\bcourser(a)?\\b', 'Education', 'Savings & Future'],
    ['\\budemy\\b', 'Education', 'Savings & Future'],
    ['\\bskillshare\\b', 'Education', 'Savings & Future'],
    ['\\blinkedin learning\\b', 'Education', 'Savings & Future'],
    ['\\bpluralsight\\b', 'Education', 'Savings & Future'],

    // ── Personal care ──
    ['\\bboots\\b', 'Personal Care', 'Daily Essentials'],
    ['\\bsuperdrug\\b', 'Personal Care', 'Daily Essentials'],
    ['\\bulta\\b', 'Personal Care', 'Daily Essentials'],
    ['\\bsephora\\b', 'Personal Care', 'Daily Essentials'],
    ['\\bbarbershop|barber\\b', 'Personal Care', 'Daily Essentials'],
    ['\\bsalon\\b', 'Personal Care', 'Daily Essentials'],

    // ── Home & Hardware ──
    ['\\bb&q\\b', 'Home & DIY', 'Housing & Bills'],
    ['\\bwicves|wickes\\b', 'Home & DIY', 'Housing & Bills'],
    ['\\bhomebase\\b', 'Home & DIY', 'Housing & Bills'],
    ['\\bscrewfix\\b', 'Home & DIY', 'Housing & Bills'],
    ['\\btravis perkins\\b', 'Home & DIY', 'Housing & Bills'],
    ['\\bdunelm\\b', 'Home & DIY', 'Housing & Bills'],
    ['\\bikea\\b', 'Home & DIY', 'Housing & Bills'],
    ['\\bwayfair\\b', 'Home & DIY', 'Housing & Bills'],
    ['\\bhome depot\\b', 'Home & DIY', 'Housing & Bills'],
    ['\\blowe.?s\\b', 'Home & DIY', 'Housing & Bills'],
    ['\\bbeds online\\b', 'Home & DIY', 'Housing & Bills'],

    // ── Childcare / School ──
    ['\\bnursery\\b', 'Childcare', 'Family Essentials'],
    ['\\bschool fees\\b', 'Childcare', 'Family Essentials'],
    ['\\bclubhouse\\b', 'Childcare', 'Family Essentials'],

    // ── Travel / Hotels ──
    ['\\bairbnb\\b', 'Accommodation', 'Going Out & Lifestyle'],
    ['\\bbooking.com\\b', 'Accommodation', 'Going Out & Lifestyle'],
    ['\\bexpedia\\b', 'Accommodation', 'Going Out & Lifestyle'],
    ['\\btravellodge\\b', 'Accommodation', 'Going Out & Lifestyle'],
    ['\\bpremier inn\\b', 'Accommodation', 'Going Out & Lifestyle'],
    ['\\bholiday inn\\b', 'Accommodation', 'Going Out & Lifestyle'],
    ['\\bhilton\\b', 'Accommodation', 'Going Out & Lifestyle'],
    ['\\bmarriott\\b', 'Accommodation', 'Going Out & Lifestyle'],
    ['\\bhyatt\\b', 'Accommodation', 'Going Out & Lifestyle'],

    // ── ATM / Cash ──
    ['\\batm\\b|cash machine\\b|cashpoint\\b', 'Cash & ATM', 'Daily Essentials'],
];

// Medium confidence rules – broader patterns that might match unintended vendors
const MEDIUM_CONFIDENCE_RULES: Rule[] = [
    ['grocery|grocer|supermark', 'Groceries', 'Daily Essentials'],
    ['takeaway|takeout|delivery food', 'Dining Out', 'Going Out & Lifestyle'],
    ['restaurant|bistro|cafe|diner\\b', 'Dining Out', 'Going Out & Lifestyle'],
    ['coffee|bakery|pastry', 'Dining Out', 'Going Out & Lifestyle'],
    ['petrol|fuel|gas station|filling station', 'Fuel', 'Daily Essentials'],
    ['pharmacy|chemist|drug store', 'Health', 'Daily Essentials'],
    ['gym|fitness|yoga|pilates|crossfit', 'Gym & Wellness', 'Going Out & Lifestyle'],
    ['streaming|subscription|membership', 'Subscriptions', 'Going Out & Lifestyle'],
    ['electric|gas bill|energy bill|utilities', 'Energy & Utilities', 'Housing & Bills'],
    ['broadband|internet|wifi', 'Internet & Phone', 'Housing & Bills'],
    ['mobile|phone bill|sim|contract phone', 'Internet & Phone', 'Housing & Bills'],
    ['clothing|fashion|apparel|clothes', 'Clothing', 'Going Out & Lifestyle'],
    ['insurance|insurer|cover\\b', 'Insurance', 'Housing & Bills'],
    ['pub\\b|bar\\b|club\\b|nightclub|drinks\\b', 'Nights Out', 'Going Out & Lifestyle'],
    ['hotel|hostel|motel|resort\\b', 'Accommodation', 'Going Out & Lifestyle'],
    ['flight|airline|airport', 'Transport', 'Daily Essentials'],
    ['train|rail|metro|underground|tram', 'Transport', 'Daily Essentials'],
    ['bus\\b|coach\\b', 'Transport', 'Daily Essentials'],
    ['taxi|cab\\b|rideshare', 'Transport', 'Daily Essentials'],
    ['parking\\b|car park', 'Transport', 'Daily Essentials'],
    ['donation|charity|fund\\b', 'Charity & Donations', 'Savings & Future'],
    ['education|tuition|course\\b|training\\b', 'Education', 'Savings & Future'],
    ['rent\\b|letting\\b|landlord', 'Rent', 'Housing & Bills'],
    ['mortgage\\b', 'Mortgage', 'Housing & Bills'],
    ['council tax\\b', 'Council Tax', 'Housing & Bills'],
    ['salon|hairdress|barber\\b|haircut', 'Personal Care', 'Daily Essentials'],
    ['beauty\\b|spa\\b|nail', 'Personal Care', 'Daily Essentials'],
    ['book\\b|stationery|paper\\b', 'Stationery & Books', 'Daily Essentials'],
    ['hardware|diy\\b|tools\\b', 'Home & DIY', 'Housing & Bills'],
    ['vet\\b|pet\\b', 'Pet Care', 'Daily Essentials'],
    ['dentist|dental\\b', 'Health', 'Daily Essentials'],
    ['doctor|gp\\b|medical\\b|hospital\\b', 'Health', 'Daily Essentials'],
    ['invest|broker|shares|stocks|isa\\b', 'Investments', 'Savings & Investments'],
    ['savings|transfer to savings', 'Savings', 'Savings & Investments'],
    ['cinema|theatre|concert|show\\b', 'Entertainment', 'Going Out & Lifestyle'],
    ['game\\b|gaming\\b|esport', 'Entertainment', 'Going Out & Lifestyle'],
    ['sport\\b|football|cricket|tennis', 'Hobbies', 'Going Out & Lifestyle'],
    ['child|kids\\b|baby\\b|toddler', 'Childcare', 'Family Essentials'],
    ['school\\b|nursery\\b', 'Childcare', 'Family Essentials'],
];

// ─── Compiled rule sets ────────────────────────────────────────────────────────

interface CompiledRule {
    regex: RegExp;
    categoryKeyword: string;
    groupKeyword: string;
    confidence: AutoCatConfidence;
}

function compileRules(rules: Rule[], confidence: AutoCatConfidence): CompiledRule[] {
    return rules.map(([pattern, cat, group]) => ({
        regex: new RegExp(pattern, 'i'),
        categoryKeyword: cat,
        groupKeyword: group,
        confidence,
    }));
}

const COMPILED_RULES: CompiledRule[] = [
    ...compileRules(HIGH_CONFIDENCE_RULES, 'high'),
    ...compileRules(MEDIUM_CONFIDENCE_RULES, 'medium'),
];

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * Given a raw vendor name from a bank CSV, return an auto-categorization
 * suggestion (or null if nothing matches).
 *
 * @param vendorName  Raw vendor string from the CSV
 */
export function suggestCategory(vendorName: string): AutoCatSuggestion | null {
    const normalised = vendorName
        .toLowerCase()
        .trim()
        .replace(/[_\-–—]+/g, ' ')
        .replace(/\s+/g, ' ')
        // strip common UK bank prefixes
        .replace(/^(card payment to|payment to|direct debit to|standing order to|transfer to|transfer from|pos |visa |mastercard |debit )/i, '')
        // strip trailing reference codes
        .replace(/\s+ref[:\s].*$/i, '')
        .replace(/\s+[A-Z0-9]{6,}$/, '')
        .trim();

    for (const rule of COMPILED_RULES) {
        if (rule.regex.test(normalised)) {
            return {
                categoryKeyword: rule.categoryKeyword,
                groupKeyword: rule.groupKeyword,
                confidence: rule.confidence,
                reason: `Matched "${rule.categoryKeyword}" by keyword`,
            };
        }
    }

    return null;
}

/**
 * Given a suggestion and the user's actual category list, find the best
 * matching category ID.
 *
 * Matching strategy (first hit wins):
 *   1. Exact name match (case-insensitive)
 *   2. Category name contains the keyword
 *   3. Keyword contains the category name (partial reverse match)
 */
export function resolveCategory<T extends { id: string; name: string }>(
    suggestion: AutoCatSuggestion,
    categories: T[],
): T | null {
    const keyword = suggestion.categoryKeyword.toLowerCase();

    // 1. Exact match
    const exact = categories.find(c => c.name.toLowerCase() === keyword);
    if (exact) return exact;

    // 2. Category name is a substring of the keyword (e.g. keyword "Groceries & Household", cat "Groceries")
    const fwd = categories.find(c => keyword.includes(c.name.toLowerCase()));
    if (fwd) return fwd;

    // 3. Keyword is a substring of the category name (e.g. cat "Food & Groceries", keyword "Groceries")
    const rev = categories.find(c => c.name.toLowerCase().includes(keyword));
    if (rev) return rev;

    return null;
}
