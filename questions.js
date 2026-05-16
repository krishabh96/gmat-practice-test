const PRELOADED_QUESTIONS = [
  {
    "id": "Q_1778872915406_0_461",
    "section": "Q",
    "difficulty": "Easy",
    "topic": "",
    "question": "A certain restaurant that regularly advertises through the mail has 1,040 cover letters and 3,000 coupons in stock. In its next mailing, each envelope will contain 1 cover letter and 2 coupons. If all of the cover letters in stock are used, how many coupons will remain in stock after this mailing?",
    "options": {
      "A": "920",
      "B": "1,040",
      "C": "1,500",
      "D": "1,960",
      "E": "2,080"
    },
    "answer": "A",
    "explanation": "In the next mailing there will be 1,040 cover letters and 2(1,040) = 2,080 coupons.\nTherefore, after the next mailing the number of coupons remaining in stock will be 3,000 –\n2,080 = 920.",
    "sectional": "2"
  },
  {
    "id": "Q_1778932070137_0_7282",
    "section": "Q",
    "difficulty": "Medium",
    "topic": "",
    "question": "If n is a positive integer and n² is divisible by 72, then the largest positive integer that must divide n is",
    "options": {
      "A": "6",
      "B": "12",
      "C": "24",
      "D": "36",
      "E": "48"
    },
    "answer": "B",
    "explanation": "72 = 8 × 9 = 2³ × 3². For n² to be divisible by 72, n² must contain at least 2³ × 3². Since n² has even exponents, n must contain at least 2² × 3 = 12. So 12 must divide n.",
    "sectional": "1"
  },
  {
    "id": "Q_1778932070137_1_3196",
    "section": "Q",
    "difficulty": "Easy",
    "topic": "",
    "question": "Jackie has two solutions that are 2 percent sulfuric acid and 12 percent sulfuric acid by volume, respectively. If these solutions are mixed in appropriate quantities to produce 60 liters of a solution that is 5 percent sulfuric acid, approximately how many liters of the 2 percent solution will be required?",
    "options": {
      "A": "18",
      "B": "20",
      "C": "24",
      "D": "36",
      "E": "42"
    },
    "answer": "E",
    "explanation": "Let x = liters of 2% solution. Then (60 - x) = liters of 12% solution. Setting up: 0.02x + 0.12(60 - x) = 0.05 × 60 → 0.02x + 7.2 - 0.12x = 3 → -0.10x = -4.2 → x = 42.",
    "sectional": "1"
  },
  {
    "id": "Q_1778932070137_2_8422",
    "section": "Q",
    "difficulty": "Hard",
    "topic": "",
    "question": "The closing price of Stock X changed on each trading day last month. The percent change in the closing price of Stock X from the first trading day last month to each of the other trading days last month was less than 50 percent. If the closing price on the second trading day last month was $10.00, which of the following CANNOT be the closing price on the last trading day last month?",
    "options": {
      "A": "$3.00",
      "B": "$9.00",
      "C": "$19.00",
      "D": "$24.00",
      "E": "$29.00"
    },
    "answer": "A",
    "explanation": "The second-day price is $10.00. The percent change from the first day to any subsequent day is less than 50%. So the first-day price P₁ satisfies: |10 - P₁|/P₁ < 0.5, giving P₁ between $6.67 and $20. The last-day price must be within 50% of P₁. The lowest possible last-day price is just above 50% of $6.67 ≈ $3.33. So $3.00 CANNOT be the closing price.",
    "sectional": "1"
  },
  {
    "id": "Q_1778932070137_3_2708",
    "section": "Q",
    "difficulty": "Hard",
    "topic": "",
    "question": "4 < (7 − x)/3, which of the following must be true?\nI. 5 < x\nII. |x + 3| > 2\nIII. −(x + 5) is positive",
    "options": {
      "A": "II only",
      "B": "III only",
      "C": "I and II only",
      "D": "II and III only",
      "E": "I, II and III"
    },
    "answer": "D",
    "explanation": "Solve: 4 < (7-x)/3 → 12 < 7-x → x < -5. Check each: I. 5 < x — FALSE (x < -5). II. |x+3| > 2: since x < -5, x+3 < -2, so |x+3| > 2 — TRUE. III. -(x+5): since x < -5, x+5 < 0, so -(x+5) > 0 — TRUE. Answer: II and III only.",
    "sectional": "1"
  },
  {
    "id": "Q_1778932070137_4_5749",
    "section": "Q",
    "difficulty": "Hard",
    "topic": "",
    "question": "The ratio, by volume, of soap to alcohol to water in a certain solution is 2:50:100. The solution will be altered so that the ratio of soap to alcohol is doubled while the ratio of soap to water is halved. If the altered solution will contain 100 cubic centimeters of alcohol, how many cubic centimeters of water will it contain?",
    "options": {
      "A": "50",
      "B": "200",
      "C": "400",
      "D": "625",
      "E": "800"
    },
    "answer": "E",
    "explanation": "Original: soap:alcohol = 2:50 = 1:25; soap:water = 2:100 = 1:50. Doubled soap:alcohol ratio → 2:25 (soap:alcohol). Halved soap:water ratio → 1:100 (soap:water). New ratios: soap:alcohol = 2:25, soap:water = 1:100 = 2:200. So soap:alcohol:water = 2:25:200. If alcohol = 100, then soap = 8, water = 800.",
    "sectional": "1"
  },
  {
    "id": "Q_1778932070137_5_9246",
    "section": "Q",
    "difficulty": "Medium",
    "topic": "",
    "question": "If a motorist had driven 1 hour longer on a certain day and at an average rate of 5 miles per hour faster, he would have covered 70 more miles than he actually did. How many more miles would he have covered than he actually did if he had driven 2 hours longer and at an average rate of 10 miles per hour faster on that day?",
    "options": {
      "A": "100",
      "B": "120",
      "C": "140",
      "D": "150",
      "E": "160"
    },
    "answer": "D",
    "explanation": "Let actual speed = r, actual time = t. Extra miles for scenario 1: (r+5)(t+1) - rt = 70 → rt + r + 5t + 5 - rt = 70 → r + 5t = 65. Scenario 2 extra miles: (r+10)(t+2) - rt = 2r + 10t + 20 = 2(r + 5t) + 20 = 2(65) + 20 = 150.",
    "sectional": "1"
  },
  {
    "id": "Q_1778932070137_6_3488",
    "section": "Q",
    "difficulty": "Medium",
    "topic": "",
    "question": "What values of x have a corresponding value of y that satisfies both xy > 0 and xy = x + y?",
    "options": {
      "A": "x ≤ 1",
      "B": "−1 < x ≤ 0",
      "C": "0 < x ≤ 1",
      "D": "x > 1",
      "E": "All real numbers"
    },
    "answer": "D",
    "explanation": "From xy = x + y → y(x-1) = x → y = x/(x-1). For xy > 0, x and y must have the same sign. y = x/(x-1) > 0 when x and (x-1) have the same sign, i.e., both positive (x > 1) or both negative (x < 0). But if x < 0, then xy = x + y < 0 (since both x and y would be negative... checking: x < 0 gives y = x/(x-1) = negative/negative = positive, so xy < 0). Only x > 1 satisfies xy > 0.",
    "sectional": "1"
  },
  {
    "id": "Q_1778932070137_7_7495",
    "section": "Q",
    "difficulty": "Medium",
    "topic": "",
    "question": "Which of the following equations has 1 + √2 as one of its roots?",
    "options": {
      "A": "x² + 2x – 1 = 0",
      "B": "x² – 2x + 1 = 0",
      "C": "x² + 2x + 1 = 0",
      "D": "x² – 2x – 1 = 0",
      "E": "x² – x – 1 = 0"
    },
    "answer": "D",
    "explanation": "Substitute x = 1+√2 into D: (1+√2)² - 2(1+√2) - 1 = 1 + 2√2 + 2 - 2 - 2√2 - 1 = 0. ✓ Alternatively, if 1+√2 is a root, so is 1-√2 (conjugate). Sum of roots = 2 = coefficient rule for -b/a, product = (1+√2)(1-√2) = -1. So equation is x² - 2x - 1 = 0.",
    "sectional": "1"
  },
  {
    "id": "Q_1778932070137_8_3587",
    "section": "Q",
    "difficulty": "Medium",
    "topic": "",
    "question": "If a committee of 3 people is to be selected from among 5 married couples so that the committee does not include two people who are married to each other, how many such committees are possible?",
    "options": {
      "A": "20",
      "B": "40",
      "C": "50",
      "D": "80",
      "E": "120"
    },
    "answer": "D",
    "explanation": "Choose 3 couples from 5 to contribute one member each: C(5,3) = 10 ways. From each chosen couple, select 1 of 2 members: 2³ = 8 ways. Total = 10 × 8 = 80.",
    "sectional": "1"
  },
  {
    "id": "Q_1778932070137_9_234",
    "section": "Q",
    "difficulty": "Easy",
    "topic": "",
    "question": "There are 10 books on a shelf, of which 4 are paperbacks and 6 are hardbacks. How many possible selections of 5 books from the shelf contain at least one paperback and at least one hardback?",
    "options": {
      "A": "75",
      "B": "120",
      "C": "210",
      "D": "246",
      "E": "252"
    },
    "answer": "D",
    "explanation": "Total ways to pick 5 from 10: C(10,5) = 252. Subtract all-paperback: C(4,5) = 0 (impossible). Subtract all-hardback: C(6,5) = 6. Valid selections = 252 - 6 = 246.",
    "sectional": "1"
  },
  {
    "id": "Q_1778932070137_10_4976",
    "section": "Q",
    "difficulty": "Medium",
    "topic": "",
    "question": "A certain club has 10 members, including Harry. One of the 10 members is to be chosen at random to be the president, one of the remaining 9 members is to be chosen at random to be the secretary, and one of the remaining 8 members is to be chosen at random to be the treasurer. What is the probability that Harry will be either the member chosen to be the secretary or the member chosen to be the treasurer?",
    "options": {
      "A": "1/720",
      "B": "1/80",
      "C": "1/10",
      "D": "1/9",
      "E": "1/5"
    },
    "answer": "E",
    "explanation": "P(Harry is secretary) = P(not president) × P(secretary | not president) = (9/10) × (1/9) = 1/10. P(Harry is treasurer) = P(not president) × P(not secretary | not president) × P(treasurer) = (9/10)(8/9)(1/8) = 1/10. Total = 1/10 + 1/10 = 2/10 = 1/5.",
    "sectional": "1"
  },
  {
    "id": "Q_1778932070137_11_5710",
    "section": "Q",
    "difficulty": "Medium",
    "topic": "",
    "question": "If 3 < x < 100, for how many values of x is x/3 the square of a prime number?",
    "options": {
      "A": "Two",
      "B": "Three",
      "C": "Four",
      "D": "Five",
      "E": "Nine"
    },
    "answer": "B",
    "explanation": "We need x/3 = p² where p is prime, so x = 3p². Primes: p=2 → x=12; p=3 → x=27; p=5 → x=75; p=7 → x=147 (> 100). Valid values: 12, 27, 75 — three values.",
    "sectional": "1"
  },
  {
    "id": "Q_1778932070137_12_7054",
    "section": "Q",
    "difficulty": "Hard",
    "topic": "",
    "question": "Of the 300 subjects who participated in an experiment using virtual-reality therapy to reduce their fear of heights, 40 percent experienced sweaty palms, 30 percent experienced vomiting, and 75 percent experienced dizziness. If all of the subjects experienced at least one of these effects and 35 percent of the subjects experienced exactly two of these effects, how many of the subjects experienced only one of these effects?",
    "options": {
      "A": "105",
      "B": "125",
      "C": "130",
      "D": "180",
      "E": "195"
    },
    "answer": "D",
    "explanation": "Total = 300. Sum of individual percentages = 40+30+75 = 145% → 435 subject-effects. Using inclusion-exclusion: 435 = 1×(only one) + 2×(exactly two) + 3×(all three). Let a = only one, b = exactly two = 35% × 300 = 105, c = all three. Also a + b + c = 300. So: a + 2(105) + 3c = 435 and a + 105 + c = 300 → a + c = 195. Subtracting: 105 + 2c = 240 → c = 135/2... Let's use: a + 210 + 3c = 435 → a + 3c = 225 and a + c = 195 → 2c = 30 → c = 15. Then a = 195 - 15 = 180.",
    "sectional": "1"
  },
  {
    "id": "Q_1778932070137_13_233",
    "section": "Q",
    "difficulty": "Hard",
    "topic": "",
    "question": "The product of all the prime numbers less than 20 is closest to which of the following powers of 10?",
    "options": {
      "A": "10⁹",
      "B": "10⁸",
      "C": "10⁷",
      "D": "10⁶",
      "E": "10⁵"
    },
    "answer": "C",
    "explanation": "Primes less than 20: 2, 3, 5, 7, 11, 13, 17, 19. Product = 2×3×5×7×11×13×17×19 = 9,699,690 ≈ 9.7 × 10⁶, which is closest to 10⁷.",
    "sectional": "1"
  },
  {
    "id": "Q_1778932070137_14_1571",
    "section": "Q",
    "difficulty": "Medium",
    "topic": "",
    "question": "A can complete a project in 20 days and B can complete the same project in 30 days. If A and B start working on the project together and A quits 10 days before the project is completed, in how many days will the project be completed?",
    "options": {
      "A": "18 days",
      "B": "27 days",
      "C": "26.67 days",
      "D": "16 days",
      "E": "12 days"
    },
    "answer": "A",
    "explanation": "Let total days = d. A works for (d-10) days, B works for d days. A's rate = 1/20, B's rate = 1/30. Equation: (d-10)/20 + d/30 = 1. Multiply by 60: 3(d-10) + 2d = 60 → 3d - 30 + 2d = 60 → 5d = 90 → d = 18.",
    "sectional": "1"
  },
  {
    "id": "Q_1778932070137_15_4483",
    "section": "Q",
    "difficulty": "Hard",
    "topic": "",
    "question": "A car traveling at a certain constant speed takes 2 seconds longer to travel 1 kilometer than it would take to travel 1 kilometer at 75 kilometers per hour. At what speed, in kilometers per hour, is the car traveling?",
    "options": {
      "A": "71.5",
      "B": "72",
      "C": "72.5",
      "D": "73",
      "E": "73.5"
    },
    "answer": "B",
    "explanation": "Time at 75 km/h for 1 km = 1/75 hours = 3600/75 = 48 seconds. The car takes 50 seconds. Speed = 1 km ÷ (50/3600) h = 3600/50 = 72 km/h.",
    "sectional": "1"
  },
  {
    "id": "Q_1778932070137_16_2131",
    "section": "Q",
    "difficulty": "Easy",
    "topic": "",
    "question": "If y is an integer, then the least possible value of |23 − 5y| is",
    "options": {
      "A": "1",
      "B": "2",
      "C": "3",
      "D": "4",
      "E": "5"
    },
    "answer": "B",
    "explanation": "We want 5y as close to 23 as possible. 5×4 = 20 → |23-20| = 3. 5×5 = 25 → |23-25| = 2. No integer y gives 5y = 23 (not divisible by 5). Minimum is 2.",
    "sectional": "1"
  },
  {
    "id": "Q_1778932070137_17_3321",
    "section": "Q",
    "difficulty": "Easy",
    "topic": "",
    "question": "If a, b, and c are constants, a > b > c, and x³ − x = (x − a)(x − b)(x − c) for all numbers x, what is the value of b?",
    "options": {
      "A": "−3",
      "B": "−1",
      "C": "0",
      "D": "1",
      "E": "3"
    },
    "answer": "C",
    "explanation": "Factor the left side: x³ - x = x(x²-1) = x(x-1)(x+1) = (x-1)(x)(x+1). So the roots are x = -1, 0, 1 and a=1, b=0, c=-1 (since a > b > c). Therefore b = 0.",
    "sectional": "1"
  },
  {
    "id": "Q_1778932070137_18_4636",
    "section": "Q",
    "difficulty": "Easy",
    "topic": "",
    "question": "Car A is 20 miles behind car B, which is traveling in the same direction along the same route as Car A. Car A is traveling at a constant speed of 58 miles per hour and Car B is traveling at a constant speed of 50 miles per hour. How many hours will it take for Car A to overtake and drive 8 miles ahead of Car B?",
    "options": {
      "A": "1.5",
      "B": "2.0",
      "C": "2.5",
      "D": "3.0",
      "E": "3.5"
    },
    "answer": "E",
    "explanation": "Car A needs to close the 20-mile gap AND go 8 miles further ahead — a total relative distance of 28 miles. Relative speed = 58 - 50 = 8 mph. Time = 28/8 = 3.5 hours.",
    "sectional": "1"
  },
  {
    "id": "Q_1778932070137_19_5615",
    "section": "Q",
    "difficulty": "Easy",
    "topic": "",
    "question": "Among a group of 2,500 people, 35 percent invest in municipal bonds, 18 percent invest in oil stocks, and 7 percent invest in both municipal bonds and oil stocks. If 1 person is to be randomly selected from the 2,500 people, what is the probability that the person selected will be one who invests in municipal bonds but NOT in oil stocks?",
    "options": {
      "A": "9/50",
      "B": "7/25",
      "C": "7/20",
      "D": "21/50",
      "E": "27/50"
    },
    "answer": "B",
    "explanation": "Municipal bonds only = 35% - 7% = 28% = 28/100 = 7/25.",
    "sectional": "1"
  },
  {
    "id": "Q_1778932070137_20_2143",
    "section": "Q",
    "difficulty": "Hard",
    "topic": "",
    "question": "Of the science books in a certain supply room, 50 are on botany, 65 are on zoology, 90 are on physics, 50 are on geology, and 110 are on chemistry. If science books are removed randomly from the supply room, how many must be removed to ensure that 80 of the books removed are on the same science?",
    "options": {
      "A": "81",
      "B": "159",
      "C": "166",
      "D": "285",
      "E": "324"
    },
    "answer": "E",
    "explanation": "Worst case: remove as many books as possible without getting 80 of any one subject. Botany has only 50, geology has only 50 — can take all of them. Zoology: 65, physics: 90, chemistry: 110 — can take 79 of each without hitting 80. Worst case = 50 + 50 + 79 + 79 + 79 + 65 = wait — zoology only has 65 so take all 65. Worst case = 50(botany) + 65(zoology) + 50(geology) + 79(physics) + 79(chemistry) = 323. The next book (324th) must be the 80th in physics or chemistry. Answer: 324.",
    "sectional": "1"
  }
];
