# AI Course Timetable — local Flask + MySQL version

Runs entirely on your own machine with WAMP (Apache + MySQL) and Python.

## 1. Create the database

Open phpMyAdmin (http://localhost/phpmyadmin), go to **Import**, and run `schema.sql`.
It creates the `timetable_db` database and all tables.

## 2. Install Python packages

```bash
cd local-flask-mysql
python -m venv venv
venv\Scripts\activate        # Windows
pip install -r requirements.txt
```

## 3. Configure

Copy `.env.example` to `.env` and fill in your MySQL username/password
(WAMP default is user `root` with an empty password).

## 4. Create the first administrator

```bash
python create_admin.py
```

## 5. Run

```bash
python app.py
```

Open http://localhost:5000 and sign in.

## How it works

- **Credit rules** decide required hours and the weekly pattern:
  2 credits → 30 hours, 4 periods, up to 4 a day, taught as one block;
  3 credits → 45 hours, 3 periods, max 1 a day;
  4 credits → 60 hours, 4 periods, max 2 a day.
- **Graph colouring** (NetworkX, DSATUR ordering) builds a clash-free starting timetable
  by connecting classes that share a teacher or a student group.
- **Genetic algorithm** then improves it over 50 generations (population 30, crossover 0.8,
  mutation 0.1, 2 elites) scoring each candidate for clashes and idle gaps.
- **Rooms** are assigned to the smallest free room of the right type that fits the class.
- **Validation** re-checks the saved timetable independently and reports any issue.

Teaching runs Monday–Friday with 7 fixed periods a day.
