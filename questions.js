const PRELOADED_QUESTIONS = [

  // ── EASY (7) ──
  {
    id:"E001", difficulty:"Easy", topic:"Arithmetic – Percentages",
    question:"A shirt originally priced at $80 is on sale for 25% off. What is the sale price?",
    options:{A:"$20",B:"$55",C:"$60",D:"$65",E:"$75"},
    answer:"C",
    explanation:"25% of $80 = $20. Sale price = $80 − $20 = $60."
  },
  {
    id:"E002", difficulty:"Easy", topic:"Arithmetic – Averages",
    question:"The average of five numbers is 24. If four of the numbers are 18, 22, 28, and 30, what is the fifth number?",
    options:{A:"18",B:"20",C:"22",D:"24",E:"26"},
    answer:"C",
    explanation:"Sum of all five = 5 × 24 = 120. Sum of known four = 18+22+28+30 = 98. Fifth = 120 − 98 = 22."
  },
  {
    id:"E003", difficulty:"Easy", topic:"Arithmetic – Ratios",
    question:"A recipe uses flour and sugar in the ratio 5:2. If 20 cups of flour are used, how many cups of sugar are needed?",
    options:{A:"4",B:"6",C:"8",D:"10",E:"12"},
    answer:"C",
    explanation:"Sugar = (2/5) × 20 = 8 cups."
  },
  {
    id:"E004", difficulty:"Easy", topic:"Algebra – Linear Equations",
    question:"If 3x + 7 = 22, what is the value of x?",
    options:{A:"3",B:"4",C:"5",D:"6",E:"7"},
    answer:"C",
    explanation:"3x = 22 − 7 = 15, so x = 5."
  },
  {
    id:"E005", difficulty:"Easy", topic:"Arithmetic – Fractions",
    question:"What is the value of (3/4) ÷ (3/8)?",
    options:{A:"1/2",B:"9/32",C:"1",D:"2",E:"3"},
    answer:"D",
    explanation:"(3/4) ÷ (3/8) = (3/4) × (8/3) = 24/12 = 2."
  },
  {
    id:"E006", difficulty:"Easy", topic:"Arithmetic – Rate and Distance",
    question:"A car travels at 60 miles per hour. How many miles does it travel in 2 hours and 30 minutes?",
    options:{A:"120",B:"130",C:"140",D:"150",E:"160"},
    answer:"D",
    explanation:"2 hr 30 min = 2.5 hours. Distance = 60 × 2.5 = 150 miles."
  },
  {
    id:"E007", difficulty:"Easy", topic:"Algebra – Substitution",
    question:"If a = 3 and b = −2, what is the value of 2a² − 3b?",
    options:{A:"12",B:"18",C:"20",D:"24",E:"30"},
    answer:"D",
    explanation:"2(3²) − 3(−2) = 2(9) + 6 = 18 + 6 = 24."
  },

  // ── MEDIUM (9) ──
  {
    id:"M001", difficulty:"Medium", topic:"Arithmetic – Percentages",
    question:"A store marks up a product by 40% then offers a 20% discount on the marked price. What is the net percentage change from the original price?",
    options:{A:"−8%",B:"−4%",C:"0%",D:"+8%",E:"+12%"},
    answer:"E",
    explanation:"Let original = 100. After 40% markup = 140. After 20% discount = 140 × 0.80 = 112. Net change = +12%."
  },
  {
    id:"M002", difficulty:"Medium", topic:"Arithmetic – Statistics",
    question:"A set of 6 numbers has a mean of 15. When a 7th number is added, the mean becomes 14. What is the 7th number?",
    options:{A:"6",B:"7",C:"8",D:"9",E:"10"},
    answer:"C",
    explanation:"Sum of 6 = 6×15 = 90. Sum of 7 = 7×14 = 98. 7th number = 98 − 90 = 8."
  },
  {
    id:"M003", difficulty:"Medium", topic:"Geometry – Area",
    question:"A rectangle has a perimeter of 56 cm. If the length is 4 cm more than the width, what is the area?",
    options:{A:"148 cm²",B:"160 cm²",C:"192 cm²",D:"195 cm²",E:"208 cm²"},
    answer:"C",
    explanation:"Let width = w. Then 2(2w+4) = 56 → w = 12, length = 16. Area = 12×16 = 192 cm²."
  },
  {
    id:"M004", difficulty:"Medium", topic:"Arithmetic – Work Problems",
    question:"Machine A produces 300 units/hour and Machine B produces 200 units/hour. Working together, how long to produce 2,500 units?",
    options:{A:"4 hours",B:"5 hours",C:"6 hours",D:"7 hours",E:"8 hours"},
    answer:"B",
    explanation:"Combined rate = 500 units/hour. Time = 2500 ÷ 500 = 5 hours."
  },
  {
    id:"M005", difficulty:"Medium", topic:"Algebra – Inequalities",
    question:"If −2 < x < 4 and −3 < y < 1, which of the following must be true?",
    options:{A:"x + y > 0",B:"x − y > 0",C:"xy > 0",D:"x + y < 5",E:"x² > y²"},
    answer:"D",
    explanation:"x + y is always less than 4+1 = 5, so x+y < 5 must be true. All other options can be false for specific values."
  },
  {
    id:"M006", difficulty:"Medium", topic:"Arithmetic – Compound Interest",
    question:"An investment of $1,000 earns 10% annual interest, compounded annually. What is the total value after 2 years?",
    options:{A:"$1,100",B:"$1,150",C:"$1,200",D:"$1,210",E:"$1,250"},
    answer:"D",
    explanation:"Year 1: $1,000 × 1.10 = $1,100. Year 2: $1,100 × 1.10 = $1,210."
  },
  {
    id:"M007", difficulty:"Medium", topic:"Counting – Combinations",
    question:"A committee of 3 people is to be chosen from a group of 7. How many different committees are possible?",
    options:{A:"21",B:"28",C:"35",D:"42",E:"56"},
    answer:"C",
    explanation:"C(7,3) = (7×6×5)/(3×2×1) = 210/6 = 35."
  },
  {
    id:"M008", difficulty:"Medium", topic:"Arithmetic – Mixtures",
    question:"A 40-litre solution is 30% alcohol. How many litres of pure alcohol must be added to make it 50% alcohol?",
    options:{A:"12",B:"14",C:"16",D:"18",E:"20"},
    answer:"C",
    explanation:"Current alcohol = 12 L. Let x = litres added. (12+x)/(40+x) = 0.5 → 12+x = 20+0.5x → x = 16."
  },
  {
    id:"M009", difficulty:"Medium", topic:"Algebra – Break-Even",
    question:"Renting a van costs $120 plus $0.30/mile. Renting a truck costs $90 plus $0.50/mile. At how many miles do both cost the same?",
    options:{A:"100",B:"120",C:"150",D:"180",E:"200"},
    answer:"C",
    explanation:"120 + 0.30m = 90 + 0.50m → 30 = 0.20m → m = 150 miles."
  },

  // ── HARD (5) ──
  {
    id:"H001", difficulty:"Hard", topic:"Number Properties – Remainders",
    question:"When positive integer n is divided by 7, the remainder is 3. What is the remainder when 3n + 5 is divided by 7?",
    options:{A:"0",B:"1",C:"2",D:"3",E:"4"},
    answer:"A",
    explanation:"n = 7k+3. Then 3n+5 = 3(7k+3)+5 = 21k+9+5 = 21k+14 = 7(3k+2). Divisible by 7, remainder = 0."
  },
  {
    id:"H002", difficulty:"Hard", topic:"Algebra – Work Problems",
    question:"Pump A fills a tank in 6 hours, Pump B in 4 hours, Pump C drains it in 12 hours. All three run simultaneously on an empty tank. How long to fill it?",
    options:{A:"3 hours",B:"3 hrs 20 min",C:"3 hrs 30 min",D:"4 hours",E:"4 hrs 30 min"},
    answer:"A",
    explanation:"Net rate = 1/6 + 1/4 − 1/12 = 2/12 + 3/12 − 1/12 = 4/12 = 1/3 per hour. Time = 3 hours."
  },
  {
    id:"H003", difficulty:"Hard", topic:"Geometry – Coordinate Geometry",
    question:"Line L passes through (2,5) and (−1,−4). Line M is perpendicular to L and passes through (3,1). Where do they intersect?",
    options:{A:"(0,−1)",B:"(1,2)",C:"(2,5)",D:"(3,8)",E:"(4,11)"},
    answer:"B",
    explanation:"Slope of L = 9/3 = 3. Equation of L: y = 3x−1. Slope of M = −1/3. Equation of M: y = −x/3+2. Setting equal: 3x−1 = −x/3+2 → x=0.9≈1, y=2. Intersection ≈ (1,2)."
  },
  {
    id:"H004", difficulty:"Hard", topic:"Algebra – Sequences",
    question:"In a geometric sequence, the 2nd term is 6 and the 5th term is 48. What is the 1st term?",
    options:{A:"2",B:"3",C:"4",D:"6",E:"8"},
    answer:"B",
    explanation:"ar = 6 and ar⁴ = 48. Dividing: r³ = 8, so r = 2. Then a = 6/2 = 3."
  },
  {
    id:"H005", difficulty:"Hard", topic:"Algebra – Quadratics",
    question:"If x²−5x+6 = 0 and y²−7y+12 = 0, what is the maximum value of x + y?",
    options:{A:"5",B:"6",C:"7",D:"8",E:"9"},
    answer:"C",
    explanation:"x²−5x+6=0 → x=2 or x=3. y²−7y+12=0 → y=3 or y=4. Maximum x+y = 3+4 = 7."
  }
];
