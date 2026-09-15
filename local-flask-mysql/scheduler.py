"""Timetable scheduling engine: credit rules, DSATUR graph colouring, genetic algorithm."""

import random
import networkx as nx

DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]
PERIODS_PER_DAY = 7
PERIOD_TIMINGS = [
    "8:30 AM - 9:25 AM",
    "9:25 AM - 10:20 AM",
    "10:40 AM - 11:35 AM",
    "11:35 AM - 12:30 PM",
    "1:25 PM - 2:20 PM",
    "2:20 PM - 3:15 PM",
    "3:15 PM - 4:10 PM",
]

# credit -> (required_hours, periods_per_week, max_periods_per_day, consecutive_block)
CREDIT_RULES = {
    2: (30, 4, 4, True),
    3: (45, 3, 1, False),
    4: (60, 4, 2, False),
}

SLOTS = [(d, p) for d in DAYS for p in range(1, PERIODS_PER_DAY + 1)]


def build_units(courses):
    """Split each course into its weekly teaching units (lab blocks stay together)."""
    units = []
    for c in courses:
        if c["consecutive_block"]:
            units.append(
                {
                    "id": f"{c['id']}-block",
                    "course": c,
                    "length": c["periods_per_week"],
                    "occurrences": list(range(1, c["periods_per_week"] + 1)),
                }
            )
        else:
            for i in range(1, c["periods_per_week"] + 1):
                units.append(
                    {"id": f"{c['id']}-{i}", "course": c, "length": 1, "occurrences": [i]}
                )
    return units


def build_conflict_graph(units):
    """Two units conflict when they share a faculty member or a student class."""
    g = nx.Graph()
    for u in units:
        g.add_node(u["id"], unit=u)
    for i, a in enumerate(units):
        for b in units[i + 1 :]:
            ca, cb = a["course"], b["course"]
            same_faculty = ca["faculty_id"] and ca["faculty_id"] == cb["faculty_id"]
            same_class = ca["department"] == cb["department"] and ca["section"] == cb["section"]
            if same_faculty or same_class:
                g.add_edge(a["id"], b["id"])
    return g


def graph_colouring(graph, units):
    """DSATUR colouring, then assign each unit the first slot free of conflicts."""
    colours = nx.coloring.greedy_color(graph, strategy="DSATUR")
    order = sorted(graph.nodes, key=lambda n: (colours.get(n, 0), -graph.degree(n)))
    by_id = {u["id"]: u for u in units}
    assignment = {}
    for node in order:
        unit = by_id[node]
        neighbour_slots = set()
        for nb in graph.neighbors(node):
            for slot in assignment.get(nb, []):
                neighbour_slots.add(slot)
        placed = _first_free_slots(unit, neighbour_slots, assignment, by_id)
        assignment[node] = placed
    return assignment


def _slot_run(start_index, length):
    day, period = SLOTS[start_index]
    if period + length - 1 > PERIODS_PER_DAY:
        return None
    return [(day, period + i) for i in range(length)]


def _first_free_slots(unit, neighbour_slots, assignment, by_id):
    for idx in range(len(SLOTS)):
        run = _slot_run(idx, unit["length"])
        if not run:
            continue
        if any(s in neighbour_slots for s in run):
            continue
        if _exceeds_daily_cap(unit, run, assignment, by_id):
            continue
        return run
    return [SLOTS[random.randrange(len(SLOTS))]] * unit["length"]


def _exceeds_daily_cap(unit, run, assignment, by_id):
    course = unit["course"]
    cap = course["max_periods_per_day"]
    day = run[0][0]
    used = sum(
        1
        for node, slots in assignment.items()
        if by_id[node]["course"]["id"] == course["id"]
        for s in slots
        if s[0] == day
    )
    return used + len(run) > cap


def assign_rooms(placements, rooms):
    """Smallest suitable room of the right type that is free at that slot."""
    busy = {}
    for p in placements:
        course = p["course"]
        candidates = sorted(
            [r for r in rooms if r["room_type"] == course["room_type"] and r["capacity"] >= course["student_count"]],
            key=lambda r: r["capacity"],
        )
        chosen = None
        for room in candidates:
            key = (room["id"], p["day"], p["period"])
            if key not in busy:
                chosen = room
                busy[key] = True
                break
        p["room_id"] = chosen["id"] if chosen else None
    return placements


def to_placements(assignment, units):
    by_id = {u["id"]: u for u in units}
    out = []
    for node, slots in assignment.items():
        unit = by_id[node]
        for i, (day, period) in enumerate(slots):
            out.append(
                {
                    "course": unit["course"],
                    "course_id": unit["course"]["id"],
                    "occurrence": unit["occurrences"][i] if i < len(unit["occurrences"]) else i + 1,
                    "day": day,
                    "period": period,
                    "timing": PERIOD_TIMINGS[period - 1],
                    "room_id": None,
                }
            )
    return out


def evaluate(assignment, units, rooms):
    """Fitness: 1000 minus weighted hard and soft violations."""
    placements = to_placements(assignment, units)
    hard, soft = count_violations(placements, rooms)
    score = 1000 - hard * 50 - soft * 5
    return max(score, 0), hard, soft


def count_violations(placements, rooms):
    hard = 0
    soft = 0
    faculty_slots = {}
    class_slots = {}
    per_course_day = {}

    for p in placements:
        c = p["course"]
        slot = (p["day"], p["period"])
        if c["faculty_id"]:
            key = (c["faculty_id"], slot)
            faculty_slots[key] = faculty_slots.get(key, 0) + 1
        ckey = ((c["department"], c["section"]), slot)
        class_slots[ckey] = class_slots.get(ckey, 0) + 1
        dkey = (c["id"], p["day"])
        per_course_day[dkey] = per_course_day.get(dkey, 0) + 1

    hard += sum(v - 1 for v in faculty_slots.values() if v > 1)
    hard += sum(v - 1 for v in class_slots.values() if v > 1)

    course_by_id = {p["course"]["id"]: p["course"] for p in placements}
    for (cid, _day), count in per_course_day.items():
        cap = course_by_id[cid]["max_periods_per_day"]
        if count > cap:
            hard += count - cap

    # soft: idle gaps in a class day
    day_map = {}
    for p in placements:
        c = p["course"]
        day_map.setdefault(((c["department"], c["section"]), p["day"]), []).append(p["period"])
    for periods in day_map.values():
        periods.sort()
        soft += (periods[-1] - periods[0] + 1) - len(periods)

    return hard, soft


def genetic_optimise(units, rooms, base_assignment, population=30, generations=50,
                     crossover_rate=0.8, mutation_rate=0.1, elite=2):
    """Each individual is scored exactly once per generation and carried as (fitness, assignment)."""
    node_ids = list(base_assignment.keys())

    def fitness(assignment):
        return evaluate(assignment, units, rooms)[0]

    def random_variant(source):
        variant = {k: list(v) for k, v in source.items()}
        for node in node_ids:
            if random.random() < 0.3:
                variant[node] = _random_run(len(variant[node]))
        return variant

    initial_fitness = fitness(base_assignment)
    pop = [{k: list(v) for k, v in base_assignment.items()}]
    pop += [random_variant(base_assignment) for _ in range(population - 1)]
    scored = sorted(((fitness(a), a) for a in pop), key=lambda x: x[0], reverse=True)
    best_score, best = scored[0]

    for _ in range(generations):
        next_pop = [{k: list(v) for k, v in a.items()} for _, a in scored[:elite]]
        while len(next_pop) < population:
            p1 = _tournament(scored)
            p2 = _tournament(scored)
            child = _crossover(p1, p2, node_ids) if random.random() < crossover_rate else dict(p1)
            for node in node_ids:
                if random.random() < mutation_rate:
                    child[node] = _random_run(len(child[node]))
            next_pop.append(child)
        scored = sorted(((fitness(a), a) for a in next_pop), key=lambda x: x[0], reverse=True)
        if scored[0][0] > best_score:
            best_score, best = scored[0]

    return best, initial_fitness


def _random_run(length):
    for _ in range(20):
        idx = random.randrange(len(SLOTS))
        run = _slot_run(idx, length)
        if run:
            return run
    return [SLOTS[0]] * length


def _tournament(scored, k=3):
    picks = random.sample(scored, min(k, len(scored)))
    return max(picks, key=lambda x: x[0])[1]


def _crossover(a, b, node_ids):
    cut = random.randrange(1, max(2, len(node_ids)))
    child = {}
    for i, node in enumerate(node_ids):
        child[node] = list(a[node]) if i < cut else list(b[node])
    return child


def generate(courses, rooms):
    """Full pipeline. Returns (placements, metrics)."""
    units = build_units(courses)
    graph = build_conflict_graph(units)
    base = graph_colouring(graph, units)
    best, initial_fitness = genetic_optimise(units, rooms, base)
    placements = assign_rooms(to_placements(best, units), rooms)
    hard, soft = count_violations(placements, rooms)
    metrics = {
        "initial_fitness": initial_fitness,
        "optimized_fitness": max(1000 - hard * 50 - soft * 5, 0),
        "hard_violations": hard,
        "soft_violations": soft,
        "validation_score": 100 if hard == 0 else max(0, 100 - hard * 10),
    }
    return placements, metrics


def validate(placements, courses, rooms):
    """Independent validation pass over a stored timetable."""
    hard, soft = count_violations(placements, rooms)
    issues = []
    scheduled = {}
    for p in placements:
        scheduled[p["course"]["id"]] = scheduled.get(p["course"]["id"], 0) + 1
    for c in courses:
        got = scheduled.get(c["id"], 0)
        if got != c["periods_per_week"]:
            issues.append(f"{c['code']}: {got}/{c['periods_per_week']} weekly periods scheduled")
    if hard:
        issues.append(f"{hard} hard constraint violations (faculty/class/room clashes)")
    return {
        "valid": hard == 0 and not issues,
        "hard_violations": hard,
        "soft_violations": soft,
        "issues": issues,
    }
