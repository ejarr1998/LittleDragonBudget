/**
 * Common everyday purchases, each pre-mapped to a category.
 * [label, categoryId, extra keywords]
 */
export type Suggestion = { label: string; categoryId: string }

const S: [string, string, string?][] = [
  // --- Gas & transport ---
  ['Shell', 'transport', 'gas fuel'], ['Chevron', 'transport', 'gas fuel'], ['Exxon', 'transport', 'gas fuel'],
  ['Costco Gas', 'transport', 'gas fuel'], ['BP', 'transport', 'gas fuel'], ['Circle K', 'transport', 'gas fuel'],
  ['Speedway', 'transport', 'gas fuel'], ['QuikTrip', 'transport', 'gas fuel'], ['Wawa', 'transport', 'gas'],
  ['Gas', 'transport', 'fuel fill up pump'], ['Uber', 'transport', 'ride'], ['Lyft', 'transport', 'ride'],
  ['Parking', 'transport', 'garage meter'], ['Toll', 'transport', 'ezpass'], ['Car wash', 'transport'],
  ['Oil change', 'transport', 'jiffy lube valvoline'], ['Tires', 'transport', 'discount tire'],
  ['EV charging', 'transport', 'tesla supercharger chargepoint electrify'],
  ['Metro / transit', 'transport', 'bus train subway'], ['Auto repair', 'transport', 'mechanic'],
  ['Car payment', 'transport', 'auto loan'], ['Registration / DMV', 'transport', 'dmv plates'],

  // --- Groceries & household ---
  ['Groceries', 'groceries', 'food store supermarket'], ["Trader Joe's", 'groceries'],
  ['Whole Foods', 'groceries'], ['Costco', 'groceries', 'warehouse'], ['Kroger', 'groceries'],
  ['Safeway', 'groceries'], ['Aldi', 'groceries'], ["Sam's Club", 'groceries'], ['Publix', 'groceries'],
  ['H-E-B', 'groceries'], ['Wegmans', 'groceries'], ['Sprouts', 'groceries'], ['Target groceries', 'groceries'],
  ['Walmart groceries', 'groceries'], ['Toilet paper', 'groceries', 'household paper'],
  ['Paper towels', 'groceries', 'household'], ['Laundry detergent', 'groceries', 'tide household'],
  ['Cleaning supplies', 'groceries', 'household clorox lysol'], ['Diapers', 'daycare', 'baby wipes pampers huggies'],
  ['Baby formula', 'daycare', 'baby infant'], ['Dog food', 'shopping', 'pet cat petco petsmart'],
  ['Pet supplies', 'shopping', 'petco petsmart chewy'], ['Vitamins', 'health', 'supplements'],

  // --- Dining ---
  ['Chick-fil-A', 'dining', 'chicken'], ['Olive Garden', 'dining', 'italian'], ["McDonald's", 'dining'],
  ['Chipotle', 'dining', 'burrito mexican'], ['Taco Bell', 'dining', 'taco mexican'], ["Wendy's", 'dining'],
  ['Burger King', 'dining', 'burger'], ['Five Guys', 'dining', 'burger'], ['In-N-Out', 'dining', 'burger'],
  ['Shake Shack', 'dining', 'burger'], ['Subway', 'dining', 'sandwich'], ['Panera Bread', 'dining', 'sandwich soup'],
  ['Panda Express', 'dining', 'chinese'], ['P.F. Chang’s', 'dining', 'chinese'], ['Sushi', 'dining', 'japanese'],
  ['Pizza Hut', 'dining', 'pizza'], ["Domino's", 'dining', 'pizza'], ["Papa John's", 'dining', 'pizza'],
  ['Little Caesars', 'dining', 'pizza'], ['Local pizza', 'dining', 'pizza'],
  ['Texas Roadhouse', 'dining', 'steak'], ['Outback Steakhouse', 'dining', 'steak'],
  ['Applebee’s', 'dining'], ['Chili’s', 'dining'], ['Buffalo Wild Wings', 'dining', 'wings sports bar'],
  ['Red Robin', 'dining', 'burger'], ['IHOP', 'dining', 'breakfast pancakes'], ['Denny’s', 'dining', 'breakfast'],
  ['Cracker Barrel', 'dining', 'breakfast'], ['Waffle House', 'dining', 'breakfast'],
  ['The Cheesecake Factory', 'dining'], ['Red Lobster', 'dining', 'seafood'], ['Noodles & Company', 'dining'],
  ['Qdoba', 'dining', 'mexican'], ['Jersey Mike’s', 'dining', 'sandwich'], ['Jimmy John’s', 'dining', 'sandwich'],
  ['Wingstop', 'dining', 'wings'], ['Popeyes', 'dining', 'chicken'], ['KFC', 'dining', 'chicken'],
  ['Raising Cane’s', 'dining', 'chicken'], ['Zaxby’s', 'dining', 'chicken'], ['Culver’s', 'dining', 'burger'],
  ['Whataburger', 'dining', 'burger'], ['Sonic', 'dining', 'burger'], ['Arby’s', 'dining', 'sandwich'],
  ['DoorDash', 'dining', 'delivery'], ['Uber Eats', 'dining', 'delivery'], ['Grubhub', 'dining', 'delivery'],
  ['Date night dinner', 'dining', 'restaurant'], ['Lunch', 'dining', 'work'], ['Brunch', 'dining'],
  ['Ice cream', 'dining', 'dessert dairy queen baskin'], ['Doughnuts', 'dining', 'krispy kreme dunkin dessert'],
  ['Bakery', 'dining', 'bread cake'],

  // --- Coffee ---
  ['Starbucks', 'coffee'], ['Dunkin’', 'coffee', 'donuts'], ['Dutch Bros', 'coffee'],
  ['Peet’s Coffee', 'coffee'], ['Tim Hortons', 'coffee'], ['Coffee shop', 'coffee', 'latte espresso cafe'],

  // --- Shopping & clothes ---
  ['Amazon', 'shopping'], ['Target', 'shopping'], ['Walmart', 'shopping'], ['Costco shopping', 'shopping'],
  ['Clothes', 'shopping', 'clothing pants shirts'], ['Pants', 'shopping', 'clothes jeans'],
  ['Shoes', 'shopping', 'clothes sneakers nike'], ['Kids clothes', 'shopping', 'children clothing carter’s'],
  ['Old Navy', 'shopping', 'clothes'], ['Gap', 'shopping', 'clothes'], ['Nike', 'shopping', 'shoes'],
  ['TJ Maxx', 'shopping', 'clothes'], ['Marshalls', 'shopping', 'clothes'], ['Ross', 'shopping', 'clothes'],
  ['Kohl’s', 'shopping', 'clothes'], ['Macy’s', 'shopping', 'clothes'], ['Nordstrom', 'shopping', 'clothes'],
  ['H&M', 'shopping', 'clothes'], ['Zara', 'shopping', 'clothes'], ['IKEA', 'shopping', 'furniture'],
  ['Home Depot', 'shopping', 'hardware tools home improvement'], ['Lowe’s', 'shopping', 'hardware tools'],
  ['Best Buy', 'shopping', 'electronics'], ['Apple Store', 'shopping', 'electronics'],
  ['Etsy', 'shopping', 'handmade gifts'], ['eBay', 'shopping'], ['Goodwill', 'shopping', 'thrift'],
  ['Birthday gift', 'shopping', 'present'], ['Christmas gifts', 'shopping', 'holiday presents'],
  ['School supplies', 'shopping', 'kids backpack'], ['Hobby Lobby', 'shopping', 'crafts'],
  ['Michaels', 'shopping', 'crafts'], ['Books', 'shopping', 'barnes noble kindle'],

  // --- Entertainment ---
  ['Movie tickets', 'entertainment', 'amc regal cinema theater'], ['AMC Theatres', 'entertainment', 'movie'],
  ['Regal Cinemas', 'entertainment', 'movie'], ['Concert tickets', 'entertainment', 'ticketmaster live nation'],
  ['Sports tickets', 'entertainment', 'game ticketmaster stubhub'], ['Bowling', 'entertainment'],
  ['Mini golf', 'entertainment', 'arcade family fun'], ['Zoo / museum', 'entertainment', 'aquarium tickets'],
  ['Steam', 'entertainment', 'video game'], ['PlayStation Store', 'entertainment', 'video game psn'],
  ['Nintendo', 'entertainment', 'video game switch'], ['Xbox', 'entertainment', 'video game game pass'],
  ['Video game', 'entertainment', 'game'], ['Miniature golf', 'entertainment'],
  ['Trampoline park', 'entertainment', 'kids'], ['State fair', 'entertainment', 'carnival festival'],

  // --- Health ---
  ['CVS', 'health', 'pharmacy'], ['Walgreens', 'health', 'pharmacy'], ['Pharmacy', 'health', 'prescription'],
  ['Doctor visit', 'health', 'copay clinic'], ['Dentist', 'health', 'dental'], ['Eye exam / glasses', 'health', 'vision optometrist'],
  ['Therapy session', 'health', 'counseling mental'], ['Gym membership', 'health', 'planet fitness ymca fitness'],
  ['Planet Fitness', 'health', 'gym'], ['YMCA', 'health', 'gym'], ['Haircut', 'health', 'barber salon great clips'],

  // --- Fixed / home ---
  ['Rent', 'rent', 'landlord apartment'], ['Mortgage', 'rent', 'home loan'],
  ['Electric bill', 'utilities', 'power'], ['Water bill', 'utilities'], ['Gas bill', 'utilities', 'heating'],
  ['Internet', 'utilities', 'xfinity comcast spectrum'], ['Phone bill', 'utilities', 'verizon att t-mobile'],
  ['Trash pickup', 'utilities', 'waste'], ['Car insurance', 'insurance', 'geico progressive'],
  ['Health insurance', 'insurance'], ['Home insurance', 'insurance'], ['Life insurance', 'insurance'],
  ['Daycare', 'daycare', 'childcare preschool tuition'], ['Babysitter', 'daycare', 'childcare'],
  ['After-school care', 'daycare', 'childcare kids'], ['Summer camp', 'daycare', 'kids camp'],
  ['Allowance', 'other', 'kids'],

  // --- Subscriptions ---
  ['Netflix', 'subscriptions', 'streaming'], ['Hulu', 'subscriptions', 'streaming'], ['Disney+', 'subscriptions', 'streaming'],
  ['Max', 'subscriptions', 'streaming hbo'], ['Prime Video', 'subscriptions', 'streaming amazon'],
  ['YouTube Premium', 'subscriptions', 'streaming'], ['Spotify', 'subscriptions', 'music'],
  ['Apple Music', 'subscriptions', 'music'], ['iCloud+', 'subscriptions', 'storage apple'],
  ['Amazon Prime', 'subscriptions', 'membership'], ['Costco membership', 'subscriptions'],
  ['ChatGPT', 'subscriptions', 'ai'], ['Audible', 'subscriptions', 'audiobooks'],

  // --- Travel ---
  ['Flight', 'travel', 'airline delta united southwest american'], ['Hotel', 'travel', 'marriott hilton holiday inn'],
  ['Airbnb', 'travel', 'vrbo vacation rental'], ['Rental car', 'travel', 'hertz enterprise'],
  ['Vacation', 'travel', 'trip'], ['Souvenirs', 'travel', 'vacation gift shop'],

  // --- Savings ---
  ['Transfer to savings', 'savings'], ['Emergency fund', 'savings'], ['Investment deposit', 'savings', ' brokerage roth ira vanguard fidelity'],

  // --- Everything else ---
  ['Hair salon', 'health', 'color cut'], ['Dry cleaning', 'other'], ['Postage / shipping', 'other', 'usps ups fedex'],
  ['Bank fee', 'other', 'atm fee'], ['Cash withdrawal', 'other', 'atm'], ['Charity / donation', 'other', 'church tithe giving'],
  ['Gift card', 'shopping', 'present'],
]

interface Entry extends Suggestion { kw: string; hay: string }
const INDEX: Entry[] = (S as [string, string, string?][]).map(([label, categoryId, kw]) => ({
  label, categoryId, kw: kw ?? '', hay: `${label.toLowerCase()} ${(kw ?? '').toLowerCase()}`,
}))

/**
 * Filter suggestions as the user types. Prefix matches on the label rank first,
 * then substring/keyword matches. User's own past merchants rank above everything.
 */
export function suggestPurchases(query: string, history: string[], limit = 8): Suggestion[] {
  const q = query.trim().toLowerCase()
  const out: Suggestion[] = []
  const seen = new Set<string>()

  // 1. Merchant history (most relevant first)
  for (const h of history) {
    if (out.length >= limit) break
    if (h.toLowerCase().includes(q) && !seen.has(h.toLowerCase())) {
      seen.add(h.toLowerCase())
      out.push({ label: h, categoryId: '' }) // category resolved by caller's own record
    }
  }
  if (!q) return out

  // 2. Built-in list — prefix first, then substring
  const prefix: Suggestion[] = []
  const partial: Suggestion[] = []
  for (const e of INDEX) {
    if (seen.has(e.label.toLowerCase())) continue
    if (e.label.toLowerCase().startsWith(q)) prefix.push(e)
    else if (e.hay.includes(q)) partial.push(e)
  }
  for (const e of [...prefix, ...partial]) {
    if (out.length >= limit) break
    seen.add(e.label.toLowerCase())
    out.push({ label: e.label, categoryId: e.categoryId })
  }
  return out
}
