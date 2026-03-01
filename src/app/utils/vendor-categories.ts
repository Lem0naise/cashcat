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
    // ── Food ──
    ['\\btesco\\b', 'Groceries', 'Food'],
    ['\\bsainsbury', 'Groceries', 'Food'],
    ['\\basda\\b', 'Groceries', 'Food'],
    ['\\bmorrisons\\b', 'Groceries', 'Food'],
    ['\\bwaitrose\\b', 'Groceries', 'Food'],
    ['\\bmarks.*spencer|m&s food|ms food\\b', 'Groceries', 'Food'],
    ['\\bco-?op\\b', 'Groceries', 'Food'],
    ['\\baldi\\b', 'Groceries', 'Food'],
    ['\\blidl\\b', 'Groceries', 'Food'],
    ['\\bicelan(d|ics)\\b', 'Groceries', 'Food'],
    ['\\bwhole foods\\b', 'Groceries', 'Food'],
    ['\\btrader joe', 'Groceries', 'Food'],
    ['\\bkroger\\b', 'Groceries', 'Food'],
    ['\\bpublix\\b', 'Groceries', 'Food'],
    ['\\bwegman', 'Groceries', 'Food'],
    ['\\bcostco\\b', 'Groceries', 'Food'],
    ['\\bsam.?s club\\b', 'Groceries', 'Food'],
    ['\\bwal.?mart\\b', 'Groceries', 'Food'],
    ['\\bspar\\b', 'Groceries', 'Food'],
    ['\\bnetto\\b', 'Groceries', 'Food'],
    ['\\bbiedronka\\b', 'Groceries', 'Food'],
    ['\\bcarrefour\\b', 'Groceries', 'Food'],
    ['\\bledermacher\\b', 'Groceries', 'Food'],
    ['\\bfarm foods\\b', 'Groceries', 'Food'],
    ['\\bocado\\b', 'Groceries', 'Food'],

    // ── Dining ──
    ['\\bmcdonald', 'Dining', 'Food'],
    ['\\bkfc\\b', 'Dining', 'Food'],
    ['\\bburger king\\b', 'Dining', 'Food'],
    ['\\bsubway\\b', 'Lunch & Drinks', 'Food'],
    ['\\bpizza hut\\b', 'Dining', 'Food'],
    ['\\bdominos|domino.?s\\b', 'Dining', 'Food'],
    ['\\bnando.?s|nandos\\b', 'Dining', 'Food'],
    ['\\bgreggs\\b', 'Lunch & Drinks', 'Food'],
    ['\\bpret a manger|pret\\b', 'Lunch & Drinks', 'Food'],
    ['\\bwetherspoon|j d wetherspoon\\b', 'Lunch & Drinks', 'Food'],
    ['\\bjust.?eat\\b', 'Dining', 'Food'],
    ['\\buber eats\\b', 'Dining', 'Food'],
    ['\\bdeliveroo\\b', 'Dining', 'Food'],
    ['\\bdoor.?dash\\b', 'Dining', 'Food'],
    ['\\bgrubhub\\b', 'Dining', 'Food'],
    ['\\bchipotle\\b', 'Lunch & Drinks', 'Food'],
    ['\\bstarbucks\\b', 'Lunch & Drinks', 'Food'],
    ['\\bcosta coffee|costa\\b', 'Lunch & Drinks', 'Food'],
    ['\\bnero|caffe nero\\b', 'Lunch & Drinks', 'Food'],
    ['\\bwagamama\\b', 'Dining', 'Food'],
    ['\\bpizzaexpress|pizza express\\b', 'Dining', 'Food'],
    ['\\boliver.?s\\b', 'Dining', 'Food'],
    ['\\btim hortons\\b', 'Lunch & Drinks', 'Food'],
    ['\\bpanera\\b', 'Lunch & Drinks', 'Food'],
    ['\\bfive guys\\b', 'Dining', 'Food'],
    ['\\bshake shack\\b', 'Dining', 'Food'],

    // ── Transport ──
    ['\\btfl\\b|transport for london', 'Transport', 'Needs'],
    ['\\boyster\\b', 'Transport', 'Needs'],
    ['\\bnational rail\\b', 'Transport', 'Needs'],
    ['\\btrainline\\b', 'Transport', 'Needs'],
    ['\\bavanti\\b', 'Transport', 'Needs'],
    ['\\bgwr|great western\\b', 'Transport', 'Needs'],
    ['\\bthameslink\\b', 'Transport', 'Needs'],
    ['\\bcrossrail\\b', 'Transport', 'Needs'],
    ['\\bnational express\\b', 'Transport', 'Needs'],
    ['\\bmegabus\\b', 'Transport', 'Needs'],
    ['\\buber\\b', 'Transport', 'Needs'],
    ['\\blyft\\b', 'Transport', 'Needs'],
    ['\\bbolt\\b', 'Transport', 'Needs'],
    ['\\bfreebird\\b', 'Transport', 'Needs'],
    ['\\bflixbus\\b', 'Transport', 'Needs'],
    ['\\beasyjet\\b', 'Transport', 'Needs'],
    ['\\bryanair\\b', 'Transport', 'Needs'],
    ['\\bba\\b|british airways\\b', 'Transport', 'Needs'],
    ['\\bdelta\\b', 'Transport', 'Needs'],
    ['\\bamerica(n)? airlines\\b', 'Transport', 'Needs'],
    ['\\bunited airlines\\b', 'Transport', 'Needs'],
    ['\\beuro.?car parks|\\bncp\\b', 'Transport', 'Needs'],

    // ── Fuel (merged into Transport) ──
    ['\\bbp\\b|british petrol', 'Transport', 'Needs'],
    ['\\bshell\\b', 'Transport', 'Needs'],
    ['\\besso\\b', 'Transport', 'Needs'],
    ['\\btexaco\\b', 'Transport', 'Needs'],
    ['\\bmobil\\b', 'Transport', 'Needs'],
    ['\\bjet petrol\\b', 'Transport', 'Needs'],
    ['\\bsainsbury.?s petrol\\b', 'Transport', 'Needs'],
    ['\\btesco petrol\\b', 'Transport', 'Needs'],
    ['\\bwm morrison petrol\\b', 'Transport', 'Needs'],

    // ── Subscriptions ──
    ['\\bnetflix\\b', 'Subscriptions', 'Wants'],
    ['\\bspotify\\b', 'Subscriptions', 'Wants'],
    ['\\bdisney\\+|disney plus\\b', 'Subscriptions', 'Wants'],
    ['\\bamazon prime\\b', 'Subscriptions', 'Wants'],
    ['\\bapple (music|tv|one|arcade|icloud|storage)\\b', 'Subscriptions', 'Wants'],
    ['\\bgoogle (one|storage|play pass)\\b', 'Subscriptions', 'Wants'],
    ['\\byoutube premium\\b', 'Subscriptions', 'Wants'],
    ['\\bhbo\\b', 'Subscriptions', 'Wants'],
    ['\\bparamount\\+|paramount plus\\b', 'Subscriptions', 'Wants'],
    ['\\bprime video\\b', 'Subscriptions', 'Wants'],
    ['\\bdeezer\\b', 'Subscriptions', 'Wants'],
    ['\\btidal\\b', 'Subscriptions', 'Wants'],
    ['\\btwitch\\b', 'Subscriptions', 'Wants'],
    ['\\bdropbox\\b', 'Subscriptions', 'Wants'],
    ['\\bnotion\\b', 'Subscriptions', 'Wants'],
    ['\\bslack\\b', 'Subscriptions', 'Wants'],
    ['\\badobeadobe|adobe (creative|photoshop|acrobat)\\b', 'Subscriptions', 'Wants'],
    ['\\bmicrosoft 365|office 365\\b', 'Subscriptions', 'Wants'],

    // ── Software (Business) ──
    ['\\bcheckout.com\\b', 'Software', 'Business'],
    ['\\baws\\b|amazon web services', 'Software', 'Business'],
    ['\\bgoogle cloud\\b', 'Software', 'Business'],
    ['\\bvercel\\b', 'Software', 'Business'],
    ['\\bgithub\\b', 'Software', 'Business'],
    ['\\bdigital.?ocean\\b', 'Software', 'Business'],

    // ── Bills ──
    ['\\bbritish gas\\b', 'Bills', 'Needs'],
    ['\\be.?on\\b', 'Bills', 'Needs'],
    ['\\boctopus energy\\b', 'Bills', 'Needs'],
    ['\\bbulb\\b', 'Bills', 'Needs'],
    ['\\bsso energy\\b', 'Bills', 'Needs'],
    ['\\bscottish power\\b', 'Bills', 'Needs'],
    ['\\bnpower\\b', 'Bills', 'Needs'],
    ['\\bev.?onik\\b', 'Bills', 'Needs'],
    ['\\bwater (bill|services|plus)\\b', 'Bills', 'Needs'],
    ['\\bthames water\\b', 'Bills', 'Needs'],
    ['\\bsevern trent\\b', 'Bills', 'Needs'],
    ['\\bconedison|con ed\\b', 'Bills', 'Needs'],
    ['\\bpg&e|pacific gas\\b', 'Bills', 'Needs'],
    ['\\bbt\\b|british telecom', 'Bills', 'Needs'],
    ['\\bvirgin media\\b', 'Bills', 'Needs'],
    ['\\bsky\\b', 'Bills', 'Needs'],
    ['\\btalktalk\\b', 'Bills', 'Needs'],
    ['\\bvoda(fone)?\\b', 'Bills', 'Needs'],
    ['\\bthree\\b', 'Bills', 'Needs'],
    ['\\bo2\\b', 'Bills', 'Needs'],
    ['\\bee\\b', 'Bills', 'Needs'],
    ['\\bgiffgaff\\b', 'Bills', 'Needs'],
    ['\\bsmartphone|mobil(e )?contract\\b', 'Bills', 'Needs'],
    ['\\bcomcast\\b', 'Bills', 'Needs'],
    ['\\bxfinity\\b', 'Bills', 'Needs'],
    ['\\bverizon\\b', 'Bills', 'Needs'],
    ['\\bat&t\\b', 'Bills', 'Needs'],
    ['\\bt-mobile\\b', 'Bills', 'Needs'],
    ['\\bsprint\\b', 'Bills', 'Needs'],

    // ── Health & Gym ──
    ['\\bpure gym\\b', 'Gym', 'Wants'],
    ['\\bplanet fitness\\b', 'Gym', 'Wants'],
    ['\\bdavid lloyd\\b', 'Gym', 'Wants'],
    ['\\bvirgin active\\b', 'Gym', 'Wants'],
    ['\\bjd gym\\b|jd gyms\\b', 'Gym', 'Wants'],
    ['\\bthe gym\\b', 'Gym', 'Wants'],
    ['\\banytime fitness\\b', 'Gym', 'Wants'],
    ['\\b24 hour fitness\\b', 'Gym', 'Wants'],
    ['\\bnhs prescriptions\\b', 'Health & Care', 'Needs'],
    ['\\bboots pharmacy\\b', 'Health & Care', 'Needs'],
    ['\\blloyds pharmacy\\b', 'Health & Care', 'Needs'],
    ['\\bcvs\\b', 'Health & Care', 'Needs'],
    ['\\bwalgreens\\b', 'Health & Care', 'Needs'],
    ['\\brite aid\\b', 'Health & Care', 'Needs'],
    ['\\bboots\\b', 'Health & Care', 'Needs'],
    ['\\bsuperdrug\\b', 'Health & Care', 'Needs'],
    ['\\bulta\\b', 'Health & Care', 'Needs'],
    ['\\bsephora\\b', 'Health & Care', 'Needs'],
    ['\\bbarbershop|barber\\b', 'Health & Care', 'Needs'],
    ['\\bsalon\\b', 'Health & Care', 'Needs'],

    // ── Shopping ──
    ['\\bamazon\\b', 'Shopping', 'Wants'],
    ['\\bebay\\b', 'Shopping', 'Wants'],
    ['\\basos\\b', 'Shopping', 'Wants'],
    ['\\bnext\\b', 'Shopping', 'Wants'],
    ['\\bprimark\\b', 'Shopping', 'Wants'],
    ['\\bh&m\\b', 'Shopping', 'Wants'],
    ['\\bzara\\b', 'Shopping', 'Wants'],
    ['\\buniqlo\\b', 'Shopping', 'Wants'],
    ['\\btk maxx\\b', 'Shopping', 'Wants'],
    ['\\bnike\\b', 'Shopping', 'Wants'],
    ['\\badidas\\b', 'Shopping', 'Wants'],
    ['\\bjd sports\\b', 'Shopping', 'Wants'],
    ['\\bfootlocker\\b', 'Shopping', 'Wants'],
    ['\\briver island\\b', 'Shopping', 'Wants'],
    ['\\btopshop\\b', 'Shopping', 'Wants'],
    ['\\bboohoo\\b', 'Shopping', 'Wants'],
    ['\\bprettylit(tle)?thing\\b', 'Shopping', 'Wants'],
    ['\\bshein\\b', 'Shopping', 'Wants'],
    ['\\bmacy.?s\\b', 'Shopping', 'Wants'],

    // ── Entertainment ──
    ['\\bcinema|cineworld|odeon|vue cinema\\b', 'Entertainment', 'Wants'],
    ['\\bsteam\\b', 'Entertainment', 'Wants'],
    ['\\bepic games\\b', 'Entertainment', 'Wants'],
    ['\\bpsn|playstation network\\b', 'Entertainment', 'Wants'],
    ['\\bxbox|microsoft games\\b', 'Entertainment', 'Wants'],
    ['\\bnintendo\\b', 'Entertainment', 'Wants'],
    ['\\bticketmaster\\b', 'Entertainment', 'Wants'],
    ['\\bsee tickets\\b', 'Entertainment', 'Wants'],
    ['\\bsky ticket\\b', 'Entertainment', 'Wants'],

    // ── Savings & Investments ──
    ['\\bvanguard\\b', 'Investments', 'Savings'],
    ['\\bfidelity\\b', 'Investments', 'Savings'],
    ['\\bfreetrade\\b', 'Investments', 'Savings'],
    ['\\btrading 212\\b', 'Investments', 'Savings'],
    ['\\bnutmeg\\b', 'Investments', 'Savings'],
    ['\\bmoneyfarm\\b', 'Investments', 'Savings'],
    ['\\bcoin.?base\\b', 'Investments', 'Savings'],
    ['\\bbinance\\b', 'Investments', 'Savings'],
    ['\\bkraken\\b', 'Investments', 'Savings'],
    ['\\betoro\\b', 'Investments', 'Savings'],

    // ── Insurance ──
    ['\\bcompare the market\\b', 'Insurance', 'Needs'],
    ['\\bmoneysupermarket\\b', 'Insurance', 'Needs'],
    ['\\baviva\\b', 'Insurance', 'Needs'],
    ['\\baxa\\b', 'Insurance', 'Needs'],
    ['\\bdirect line\\b', 'Insurance', 'Needs'],
    ['\\badmiral\\b', 'Insurance', 'Needs'],
    ['\\bchurchill\\b', 'Insurance', 'Needs'],
    ['\\bgeico\\b', 'Insurance', 'Needs'],
    ['\\bstate farm\\b', 'Insurance', 'Needs'],
    ['\\ballstate\\b', 'Insurance', 'Needs'],

    // ── Charity ──
    ['\\bjust giving|justgiving\\b', 'Charity', 'Wants'],
    ['\\bgofundme\\b', 'Charity', 'Wants'],
    ['\\bcharit(y|ies)\\b', 'Charity', 'Wants'],
    ['\\bpatreon\\b', 'Charity', 'Wants'],

    // ── Education ──
    ['\\bcourser(a)?\\b', 'Education', 'Needs'],
    ['\\budemy\\b', 'Education', 'Needs'],
    ['\\bskillshare\\b', 'Education', 'Needs'],
    ['\\blinkedin learning\\b', 'Education', 'Needs'],
    ['\\bpluralsight\\b', 'Education', 'Needs'],

    // ── Home ──
    ['\\bb&q\\b', 'Home', 'Needs'],
    ['\\bwicves|wickes\\b', 'Home', 'Needs'],
    ['\\bhomebase\\b', 'Home', 'Needs'],
    ['\\bscrewfix\\b', 'Home', 'Needs'],
    ['\\btravis perkins\\b', 'Home', 'Needs'],
    ['\\bdunelm\\b', 'Home', 'Needs'],
    ['\\bikea\\b', 'Home', 'Needs'],
    ['\\bwayfair\\b', 'Home', 'Needs'],
    ['\\bhome depot\\b', 'Home', 'Needs'],
    ['\\blowe.?s\\b', 'Home', 'Needs'],
    ['\\bbeds online\\b', 'Home', 'Needs'],

    // ── Family (Childcare / Pets) ──
    ['\\bnursery\\b', 'Family', 'Needs'],
    ['\\bschool fees\\b', 'Family', 'Needs'],
    ['\\bclubhouse\\b', 'Family', 'Needs'],

    // ── Travel ──
    ['\\bairbnb\\b', 'Travel', 'Wants'],
    ['\\bbooking.com\\b', 'Travel', 'Wants'],
    ['\\bexpedia\\b', 'Travel', 'Wants'],
    ['\\btravellodge\\b', 'Travel', 'Wants'],
    ['\\bpremier inn\\b', 'Travel', 'Wants'],
    ['\\bholiday inn\\b', 'Travel', 'Wants'],
    ['\\bhilton\\b', 'Travel', 'Wants'],
    ['\\bmarriott\\b', 'Travel', 'Wants'],
    ['\\bhyatt\\b', 'Travel', 'Wants'],

    // ── Cash ──
    ['\\batm\\b|cash machine\\b|cashpoint\\b', 'Cash', 'Wants'],
];

// Medium confidence rules – broader patterns that might match unintended vendors
const MEDIUM_CONFIDENCE_RULES: Rule[] = [
    ['grocery|grocer|supermark', 'Groceries', 'Food'],
    ['takeaway|takeout|delivery food', 'Dining', 'Food'],
    ['restaurant|bistro|diner\\b', 'Dining', 'Food'],
    ['cafe|coffee|bakery|pastry', 'Lunch & Drinks', 'Food'],
    ['petrol|fuel|gas station|filling station', 'Transport', 'Needs'],
    ['pharmacy|chemist|drug store', 'Health & Care', 'Needs'],
    ['gym|fitness|yoga|pilates|crossfit', 'Gym', 'Wants'],
    ['streaming|subscription|membership', 'Subscriptions', 'Wants'],
    ['electric|gas bill|energy bill|utilities', 'Bills', 'Needs'],
    ['broadband|internet|wifi', 'Bills', 'Needs'],
    ['mobile|phone bill|sim|contract phone', 'Bills', 'Needs'],
    ['clothing|fashion|apparel|clothes', 'Shopping', 'Wants'],
    ['insurance|insurer|cover\\b', 'Insurance', 'Needs'],
    ['pub\\b|bar\\b|club\\b|nightclub|drinks\\b', 'Entertainment', 'Wants'],
    ['hotel|hostel|motel|resort\\b', 'Travel', 'Wants'],
    ['flight|airline|airport', 'Travel', 'Wants'],
    ['train|rail|metro|underground|tram', 'Transport', 'Needs'],
    ['bus\\b|coach\\b', 'Transport', 'Needs'],
    ['taxi|cab\\b|rideshare', 'Transport', 'Needs'],
    ['parking\\b|car park', 'Transport', 'Needs'],
    ['donation|charity|fund\\b', 'Charity', 'Wants'],
    ['education|tuition|course\\b|training\\b', 'Education', 'Needs'],
    ['rent\\b|letting\\b|landlord', 'Housing', 'Needs'],
    ['mortgage\\b', 'Housing', 'Needs'],
    ['council tax\\b', 'Bills', 'Needs'],
    ['salon|hairdress|barber\\b|haircut', 'Health & Care', 'Needs'],
    ['beauty\\b|spa\\b|nail', 'Health & Care', 'Needs'],
    ['book\\b|stationery|paper\\b', 'Shopping', 'Wants'],
    ['hardware|diy\\b|tools\\b', 'Home', 'Needs'],
    ['vet\\b|pet\\b', 'Family', 'Needs'],
    ['dentist|dental\\b', 'Health & Care', 'Needs'],
    ['doctor|gp\\b|medical\\b|hospital\\b', 'Health & Care', 'Needs'],
    ['invest|broker|shares|stocks|isa\\b', 'Investments', 'Savings'],
    ['savings|transfer to savings', 'Savings', 'Savings'],
    ['cinema|theatre|concert|show\\b', 'Entertainment', 'Wants'],
    ['game\\b|gaming\\b|esport', 'Entertainment', 'Wants'],
    ['sport\\b|football|cricket|tennis', 'Entertainment', 'Wants'],
    ['child|kids\\b|baby\\b|toddler', 'Family', 'Needs'],
    ['school\\b|nursery\\b', 'Family', 'Needs'],
    ['software|sass|hosting|domain', 'Software', 'Business'],
    ['tax\\b|hmrc|irs', 'Taxes', 'Business'],
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
