-- Part 1C: Nutrition tracking — catalog, per-user goals, meal logs
CREATE TABLE IF NOT EXISTS food_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  serving_label TEXT NOT NULL DEFAULT '100 g',
  calories NUMERIC NOT NULL,
  protein_g NUMERIC NOT NULL DEFAULT 0,
  carbs_g NUMERIC NOT NULL DEFAULT 0,
  fat_g NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_food_items_name_lower ON food_items (lower(name));

CREATE TABLE IF NOT EXISTS nutrition_goals (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  calories_goal INTEGER NOT NULL DEFAULT 2000 CHECK (calories_goal BETWEEN 800 AND 10000),
  protein_g NUMERIC NOT NULL DEFAULT 150 CHECK (protein_g >= 0 AND protein_g <= 500),
  carbs_g NUMERIC NOT NULL DEFAULT 200 CHECK (carbs_g >= 0 AND carbs_g <= 800),
  fat_g NUMERIC NOT NULL DEFAULT 65 CHECK (fat_g >= 0 AND fat_g <= 300),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS meal_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  food_item_id UUID NOT NULL REFERENCES food_items(id) ON DELETE RESTRICT,
  logged_date DATE NOT NULL DEFAULT CURRENT_DATE,
  meal_type TEXT NOT NULL CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')),
  servings NUMERIC NOT NULL DEFAULT 1 CHECK (servings > 0 AND servings <= 50),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_meal_logs_user_date ON meal_logs (user_id, logged_date DESC);

ALTER TABLE food_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE nutrition_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "food_items_select_authenticated" ON food_items;
CREATE POLICY "food_items_select_authenticated"
  ON food_items FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "nutrition_goals_select_own" ON nutrition_goals;
CREATE POLICY "nutrition_goals_select_own"
  ON nutrition_goals FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "nutrition_goals_insert_own" ON nutrition_goals;
CREATE POLICY "nutrition_goals_insert_own"
  ON nutrition_goals FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "nutrition_goals_update_own" ON nutrition_goals;
CREATE POLICY "nutrition_goals_update_own"
  ON nutrition_goals FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "meal_logs_select_own" ON meal_logs;
CREATE POLICY "meal_logs_select_own"
  ON meal_logs FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "meal_logs_insert_own" ON meal_logs;
CREATE POLICY "meal_logs_insert_own"
  ON meal_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "meal_logs_update_own" ON meal_logs;
CREATE POLICY "meal_logs_update_own"
  ON meal_logs FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "meal_logs_delete_own" ON meal_logs;
CREATE POLICY "meal_logs_delete_own"
  ON meal_logs FOR DELETE
  USING (auth.uid() = user_id);

-- Seed common foods once (expand in follow-up migrations if needed)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM food_items LIMIT 1) THEN
    INSERT INTO food_items (name, serving_label, calories, protein_g, carbs_g, fat_g) VALUES
      ('Chicken breast, grilled', '100 g', 165, 31, 0, 3.6),
      ('Chicken thigh, roasted', '100 g', 209, 26, 0, 11),
      ('Turkey breast', '100 g', 135, 30, 0, 1),
      ('Ground beef, 90% lean, cooked', '100 g', 250, 26, 0, 15),
      ('Ground beef, 80% lean, cooked', '100 g', 272, 25, 0, 18),
      ('Salmon, baked', '100 g', 206, 22, 0, 12),
      ('Tuna, canned in water', '100 g', 116, 26, 0, 0.8),
      ('Egg, whole', '1 large', 78, 6.3, 0.6, 5.3),
      ('Egg white', '100 g', 52, 11, 0.7, 0.2),
      ('Greek yogurt, plain nonfat', '100 g', 59, 10, 3.6, 0.4),
      ('Greek yogurt, plain whole', '100 g', 94, 9, 4, 5),
      ('Cottage cheese, low-fat', '100 g', 72, 12, 3.4, 1),
      ('Milk, whole', '240 ml', 149, 7.7, 12, 7.9),
      ('Milk, skim', '240 ml', 83, 8.2, 12, 0.2),
      ('Cheddar cheese', '30 g', 120, 7, 0.4, 10),
      ('Mozzarella, part skim', '30 g', 72, 6.9, 0.8, 4.5),
      ('Tofu, firm', '100 g', 144, 17, 3, 9),
      ('Black beans, cooked', '100 g', 132, 8.9, 24, 0.5),
      ('Chickpeas, cooked', '100 g', 164, 8.9, 27, 2.6),
      ('Lentils, cooked', '100 g', 116, 9, 20, 0.4),
      ('Brown rice, cooked', '100 g', 111, 2.6, 23, 0.9),
      ('White rice, cooked', '100 g', 130, 2.7, 28, 0.3),
      ('Quinoa, cooked', '100 g', 120, 4.4, 21, 1.9),
      ('Oats, dry', '40 g', 150, 5, 27, 3),
      ('Whole wheat bread', '1 slice', 81, 4, 14, 1),
      ('White bread', '1 slice', 75, 2.6, 14, 1),
      ('Pasta, cooked', '100 g', 131, 5, 25, 1.1),
      ('Sweet potato, baked', '100 g', 90, 2, 21, 0.1),
      ('Potato, baked', '100 g', 93, 2.5, 21, 0.1),
      ('Banana', '1 medium', 105, 1.3, 27, 0.4),
      ('Apple', '1 medium', 95, 0.5, 25, 0.3),
      ('Orange', '1 medium', 62, 1.2, 15, 0.2),
      ('Blueberries', '100 g', 57, 0.7, 14, 0.3),
      ('Strawberries', '100 g', 32, 0.7, 7.7, 0.3),
      ('Avocado', '100 g', 160, 2, 8.5, 15),
      ('Broccoli, steamed', '100 g', 35, 2.4, 7, 0.4),
      ('Spinach, raw', '100 g', 23, 2.9, 3.6, 0.4),
      ('Carrots, raw', '100 g', 41, 0.9, 9.6, 0.2),
      ('Tomato', '100 g', 18, 0.9, 3.9, 0.2),
      ('Mixed salad greens', '100 g', 17, 1.5, 3.2, 0.2),
      ('Almonds', '28 g', 164, 6, 6, 14),
      ('Peanut butter', '32 g', 190, 7, 7, 16),
      ('Walnuts', '28 g', 185, 4.3, 3.9, 18),
      ('Olive oil', '1 tbsp', 119, 0, 0, 13.5),
      ('Butter', '1 tbsp', 102, 0.1, 0, 11.5),
      ('Protein shake, whey', '1 scoop', 120, 24, 3, 1.5),
      ('Protein bar', '1 bar', 200, 20, 22, 7),
      ('Granola bar', '1 bar', 120, 2, 20, 4),
      ('Honey', '1 tbsp', 64, 0.1, 17, 0),
      ('Maple syrup', '1 tbsp', 52, 0, 13, 0),
      ('Orange juice', '240 ml', 112, 1.7, 26, 0.5),
      ('Apple juice', '240 ml', 114, 0.2, 28, 0.3),
      ('Coffee, black', '240 ml', 2, 0.3, 0, 0),
      ('Beer', '355 ml', 153, 1.6, 13, 0),
      ('Red wine', '150 ml', 125, 0.1, 3.8, 0),
      ('Pizza, cheese slice', '1 slice', 285, 12, 36, 10),
      ('Hamburger, fast food', '1 sandwich', 540, 25, 40, 30),
      ('Chicken nuggets', '6 pieces', 270, 14, 16, 18),
      ('French fries', 'medium', 365, 4, 48, 17),
      ('Burrito, bean and cheese', '1', 550, 18, 70, 22),
      ('Sushi roll, California', '8 pieces', 255, 9, 38, 7),
      ('Bagel, plain', '1', 277, 11, 54, 1.4),
      ('Croissant', '1 medium', 231, 4.7, 26, 12),
      ('Ice cream, vanilla', '100 g', 207, 3.5, 24, 11),
      ('Dark chocolate', '30 g', 155, 1.7, 13, 9),
      ('Popcorn, air-popped', '100 g', 387, 13, 78, 4.5),
      ('Corn flakes', '30 g', 110, 2, 24, 0.5),
      ('Whey protein powder', '30 g', 120, 24, 3, 1.5),
      ('Casein protein powder', '30 g', 110, 24, 3, 1),
      ('Cottage cheese, full fat', '100 g', 98, 11, 3.4, 4.3),
      ('Ham, sliced', '100 g', 145, 21, 1.5, 5.5),
      ('Shrimp, cooked', '100 g', 99, 24, 0.2, 0.3),
      ('Cod, baked', '100 g', 105, 23, 0, 0.9),
      ('Pork tenderloin, roasted', '100 g', 143, 26, 0, 3.5),
      ('Lamb chop', '100 g', 294, 25, 0, 21),
      ('Hummus', '100 g', 166, 8, 14, 10),
      ('Edamame, shelled', '100 g', 122, 11, 10, 5),
      ('Edamame, in pods', '100 g', 121, 11, 10, 5),
      ('Pear', '1 medium', 101, 0.6, 27, 0.2),
      ('Grapes', '100 g', 69, 0.7, 18, 0.2),
      ('Watermelon', '100 g', 30, 0.6, 8, 0.2),
      ('Cucumber', '100 g', 15, 0.7, 3.6, 0.1),
      ('Bell pepper, red', '100 g', 31, 1, 6, 0.3),
      ('Zucchini', '100 g', 17, 1.2, 3.1, 0.3),
      ('Mushrooms', '100 g', 22, 3.1, 3.3, 0.3),
      ('Kale, raw', '100 g', 35, 2.9, 4.4, 1.5),
      ('Chia seeds', '28 g', 138, 4.7, 12, 8.7),
      ('Flaxseed, ground', '14 g', 74, 2.6, 4, 5.9),
      ('Raisins', '40 g', 120, 1.2, 32, 0.2),
      ('Dates, medjool', '1 large', 66, 0.4, 18, 0),
      ('Coconut milk, canned light', '100 ml', 154, 1.5, 3.3, 15),
      ('Soy milk, unsweetened', '240 ml', 80, 7, 4, 4),
      ('Almond milk, unsweetened', '240 ml', 30, 1, 1, 2.5),
      ('Mayonnaise', '1 tbsp', 94, 0.1, 0.1, 10),
      ('Ketchup', '1 tbsp', 19, 0.2, 5.3, 0),
      ('Mustard', '1 tbsp', 10, 0.6, 0.6, 0.5),
      ('Salsa', '2 tbsp', 10, 0.4, 2.4, 0.1),
      ('Caesar dressing', '2 tbsp', 150, 1, 2, 16),
      ('Ranch dressing', '2 tbsp', 129, 0.4, 2, 13),
      ('Tortilla, flour 10"', '1', 234, 6.7, 36, 6.5),
      ('Pita bread, white', '1 large', 165, 5.5, 33, 0.7),
      ('Crackers, whole wheat', '5 crackers', 70, 1.5, 12, 2),
      ('Pretzels', '28 g', 110, 2.9, 23, 1),
      ('Beef jerky', '28 g', 116, 9, 3.1, 7),
      ('Trail mix', '40 g', 173, 5, 13, 12),
      ('Smoothie, fruit yogurt', '350 ml', 210, 6, 42, 2.5),
      ('Acai bowl', '1 bowl', 350, 6, 65, 10),
      ('Oatmeal, cooked with water', '1 cup', 166, 6, 28, 3.6),
      ('Cereal, bran flakes', '30 g', 100, 3, 24, 1),
      ('Waffle, frozen', '1', 90, 2.5, 13, 3),
      ('Pancake, plain', '1 medium', 90, 2.5, 14, 3),
      ('Bacon, cooked', '2 slices', 84, 6, 0.2, 6.5),
      ('Sausage, pork link', '1', 85, 4.5, 0.5, 7),
      ('Lasagna, meat', '1 piece', 380, 20, 35, 18),
      ('Mac and cheese', '1 cup', 380, 16, 48, 14),
      ('Chicken soup, canned', '1 cup', 75, 4, 9, 2.5),
      ('Tomato soup, canned', '1 cup', 85, 2, 17, 1),
      ('Sushi, salmon nigiri', '2 pieces', 106, 6, 12, 3),
      ('Pho, beef', '1 bowl', 450, 25, 55, 12),
      ('Pad Thai', '1 plate', 600, 20, 80, 22),
      ('Chicken tikka masala', '1 cup', 300, 20, 20, 16),
      ('Falafel', '4 balls', 320, 12, 35, 16),
      ('Hummus wrap', '1', 420, 14, 48, 18),
      ('Caesar salad', '1 bowl', 350, 8, 18, 28),
      ('Greek salad', '1 bowl', 220, 8, 12, 16),
      ('Cobb salad', '1 bowl', 420, 28, 14, 30),
      ('Clif Bar', '1 bar', 250, 9, 44, 6),
      ('RXBAR', '1 bar', 210, 12, 24, 9),
      ('Gatorade', '591 ml', 140, 0, 36, 0),
      ('Coca-Cola', '355 ml', 140, 0, 39, 0),
      ('Energy drink', '250 ml', 110, 0, 28, 0),
      ('Margarita', '1 cocktail', 170, 0, 10, 0),
      ('Latte, whole milk', '350 ml', 150, 8, 12, 8),
      ('Cappuccino, whole milk', '350 ml', 100, 5, 8, 4),
      ('Bubble tea', '500 ml', 350, 2, 70, 8);
  END IF;
END $$;
