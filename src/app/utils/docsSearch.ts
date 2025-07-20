// Docs search utility - optimized version
export interface DocPage {
  slug: string;
  title: string;
  description: string;
  content: string;
  path: string;
  searchableText?: string; // Pre-computed search text
}

// Cache for compiled regex patterns
const regexCache = new Map<string, RegExp>();

function getRegex(term: string): RegExp {
  if (!regexCache.has(term)) {
    regexCache.set(term, new RegExp(term, 'gi'));
  }
  return regexCache.get(term)!;
}

// Pre-compute searchable text for better performance
const rawDocsPages: Omit<DocPage, 'searchableText'>[] = [
  {
    slug: 'getting-started',
    title: 'Quick Start',
    description: 'Get up and running with CashCat in just a few minutes.',
    content: 'Quick Start guide budgeting app essential steps create account sign up email address bank accounts current checking savings credit card investment cash starting balance first budget zero-based budgeting assign every penny purpose needs wants monthly goal categories groups housing transportation food utilities entertainment savings emergency fund debt payments track spending transactions record purchases vendor description amount date account category manual tracking automatic sync periodic',
    path: '/docs/getting-started'
  },
  {
    slug: 'first-budget',
    title: 'Creating Your First Budget',
    description: 'Step-by-step walkthrough of setting up your budget.',
    content: 'Creating First Budget step-by-step walkthrough setting up budget income monthly salary freelance investment rental property expenses categories housing rent mortgage utilities transportation car payment insurance gas food groceries restaurants entertainment streaming subscriptions savings emergency fund retirement debt payment credit card loans assign money category goal amount available spend track progress month budget cycle zero balance remaining overspent future planning next month recommend budgeting ahead reduce stress plan irregular expenses Christmas gifts car maintenance annual subscriptions financial decisions savings momentum calendar special expenses plan future months highly recommended effective financial control anticipate reduce stress better decisions',
    path: '/docs/first-budget'
  },
  {
    slug: 'zero-based-budgeting',
    title: 'Zero-Based Budgeting',
    description: 'Learn the philosophy behind CashCat and how to assign every penny a purpose.',
    content: 'Zero-Based Budgeting philosophy CashCat assign every penny purpose income minus expenses equals zero give job dollar financial planning intentional spending conscious decisions needs wants savings goals emergency fund debt payment priorities values monthly budget cycle review adjust categories groups allocation planning ahead seasonal expenses irregular income multiple income streams side hustle freelance variable',
    path: '/docs/zero-based-budgeting'
  },
  {
    slug: 'best-practices',
    title: 'Best Practices',
    description: 'Tips for successful budgeting with CashCat.',
    content: 'Best Practices successful budgeting CashCat tips tricks consistency daily weekly monthly review track transactions record purchases vendor description amount accurate data honest realistic goals achievable targets emergency fund three six months expenses debt snowball avalanche method high interest minimum payments savings automation pay yourself first priorities fixed variable expenses meal planning bulk buying seasonal shopping comparison shopping negotiate bills reduce expenses increase income side hustle skills development career advancement',
    path: '/docs/best-practices'
  },
  {
    slug: 'common-questions',
    title: 'Common Questions',
    description: 'Answers to frequently asked questions.',
    content: 'Common Questions frequently asked questions FAQ help support bank integration automatic sync manual entry privacy security data encryption backup export import multiple accounts joint budget sharing family household budget categories customize groups rename delete archive transactions edit delete bulk actions reports statistics analytics mobile app desktop browser offline sync internet connection troubleshooting error messages login issues reset password',
    path: '/docs/common-questions'
  },
  {
    slug: 'transactions',
    title: 'Transaction Management',
    description: 'Learn how to effectively track your spending with transactions.',
    content: 'Transaction Management track spending purchases payments income vendor description amount date account category type payment income transfer starting balance edit delete bulk actions search filter sort date amount vendor category account reconcile bank statement accuracy manual entry automatic import CSV Excel file mobile app quick entry templates recurring transactions scheduled payments reminders notifications',
    path: '/docs/transactions'
  },
  {
    slug: 'budget-management',
    title: 'Budget Management',
    description: 'Advanced budget management techniques and strategies.',
    content: 'Budget Management advanced techniques strategies monthly budget cycle income allocation expenses categories groups goals targets emergency fund debt payment savings investment retirement monthly quarterly annual planning seasonal expenses irregular income variable expenses fixed costs utilities rent mortgage insurance subscriptions recurring payments review adjust reallocate funds overspending underspending carry forward roll over budget period future month planning recommend anticipate reduce stress financial control multi-month strategy calendar upcoming expenses seasonal holiday vacation annual bills insurance property taxes subscription renewals irregular income life events birthdays anniversaries home improvements monthly planning routine transform financial confidence sinking funds buffer miscellaneous allocation strategy 50/30/20 rule needs wants savings',
    path: '/docs/budget-management'
  },
  {
    slug: 'categories-groups',
    title: 'Categories & Groups',
    description: 'Organize your budget with categories and groups.',
    content: 'Categories Groups organize budget structure housing transportation food utilities entertainment savings debt personal care medical insurance education clothing gifts charity miscellaneous emergency fund retirement investment vacation travel home maintenance car repair medical expenses irregular seasonal quarterly annual create custom categories rename delete archive group similar expenses organize view reports analytics spending patterns trends analysis',
    path: '/docs/categories-groups'
  },
  {
    slug: 'bank-accounts',
    title: 'Bank Account Management',
    description: 'Set up and manage your bank accounts in CashCat.',
    content: 'Bank Account Management setup manage accounts checking current savings credit card investment cash money market certificate deposit retirement 401k IRA HSA multiple banks institutions starting balance initial amount reconcile statements accuracy track balances transfers between accounts internal external payments deposits withdrawals interest dividends fees charges account types purposes emergency fund vacation savings',
    path: '/docs/bank-accounts'
  },
  {
    slug: 'statistics',
    title: 'Statistics & Reports',
    description: 'Understand your spending patterns with detailed analytics.',
    content: 'Statistics Reports analytics spending patterns trends monthly quarterly annual comparison income expenses categories groups accounts pie charts bar graphs line charts time series analysis budget vs actual performance overspending underspending savings rate debt progress emergency fund growth investment returns cash flow net worth assets liabilities export data CSV Excel PDF print share insights financial health score recommendations',
    path: '/docs/statistics'
  },
  {
    slug: 'account-settings',
    title: 'Account Settings',
    description: 'Customize your CashCat experience and manage account preferences.',
    content: 'Account Settings customize CashCat experience preferences profile information email password security two-factor authentication privacy data management backup export import delete account notifications reminders alerts mobile push email SMS theme dark light currency format date format timezone language localization accessibility features support contact help feedback',
    path: '/docs/account-settings'
  },
  {
    slug: 'troubleshooting',
    title: 'Troubleshooting',
    description: 'Common issues and solutions for CashCat.',
    content: 'Troubleshooting common issues solutions problems login reset password email verification account locked sync error connection internet offline data loss backup restore import export file format CSV Excel browser compatibility mobile app update refresh cache cookies storage permissions notifications denied location timezone incorrect balance reconciliation transactions missing duplicate categories groups accounts deleted archived support contact help ticket response time FAQ knowledge base community forum',
    path: '/docs/troubleshooting'
  }
];

// Export the optimized docs pages with pre-computed search text
export const docsPages: DocPage[] = rawDocsPages.map(page => ({
  ...page,
  searchableText: `${page.title} ${page.description} ${page.content}`.toLowerCase()
}));

export function searchDocs(query: string, limit: number = 3): DocPage[] {
  if (!query.trim()) return [];
  
  const normalizedQuery = query.toLowerCase().trim();
  const searchTerms = normalizedQuery.split(' ').filter(term => term.length > 1);
  
  if (searchTerms.length === 0) return [];
  
  const results: (DocPage & { score: number })[] = [];
  
  // Single pass through pages for better performance
  for (const page of docsPages) {
    let score = 0;
    
    // Quick title check (highest priority)
    if (page.title.toLowerCase().includes(normalizedQuery)) {
      score += 100;
    }
    
    // Quick description check
    if (page.description.toLowerCase().includes(normalizedQuery)) {
      score += 50;
    }
    
    // Content term matching with cached regex
    for (const term of searchTerms) {
      const matches = page.searchableText!.match(getRegex(term));
      if (matches) {
        score += matches.length * 10;
      }
    }
    
    // Exact phrase bonus
    if (page.searchableText!.includes(normalizedQuery)) {
      score += 30;
    }
    
    // Only add if we have a score
    if (score > 0) {
      results.push({ ...page, score });
    }
    
    // Early exit optimization - if we have many high-scoring results, we can stop
    if (results.length >= limit * 3) break;
  }
  
  // Sort and limit in one operation
  return results
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
