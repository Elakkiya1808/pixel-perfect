
CREATE TYPE public.app_role AS ENUM ('admin','faculty','student');

CREATE TABLE public.faculty (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  department text NOT NULL,
  email text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.faculty TO authenticated;
GRANT ALL ON public.faculty TO service_role;
ALTER TABLE public.faculty ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_number text NOT NULL UNIQUE,
  room_type text NOT NULL CHECK (room_type IN ('Classroom','Lab')),
  capacity integer NOT NULL CHECK (capacity > 0),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rooms TO authenticated;
GRANT ALL ON public.rooms TO service_role;
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  credit integer NOT NULL CHECK (credit IN (2,3,4)),
  required_hours integer NOT NULL,
  course_type text NOT NULL CHECK (course_type IN ('Theory','Lab')),
  faculty_id uuid REFERENCES public.faculty(id) ON DELETE SET NULL,
  department text NOT NULL,
  section text NOT NULL,
  student_count integer NOT NULL DEFAULT 60,
  room_type text NOT NULL CHECK (room_type IN ('Classroom','Lab')),
  periods_per_week integer NOT NULL,
  max_periods_per_day integer NOT NULL,
  consecutive_block boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.courses TO authenticated;
GRANT ALL ON public.courses TO service_role;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.semester_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  semester_name text NOT NULL,
  semester_start_date date,
  semester_end_date date,
  semester_months integer NOT NULL DEFAULT 5,
  teaching_weeks integer NOT NULL DEFAULT 20,
  period_duration_minutes integer NOT NULL DEFAULT 55,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.semester_settings TO authenticated;
GRANT ALL ON public.semester_settings TO service_role;
ALTER TABLE public.semester_settings ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.timetable (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  occurrence integer NOT NULL,
  day text NOT NULL,
  period integer NOT NULL CHECK (period BETWEEN 1 AND 7),
  timing text NOT NULL,
  room_id uuid REFERENCES public.rooms(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.timetable TO authenticated;
GRANT ALL ON public.timetable TO service_role;
ALTER TABLE public.timetable ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.generation_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  initial_fitness numeric NOT NULL DEFAULT 0,
  optimized_fitness numeric NOT NULL DEFAULT 0,
  validation_score integer NOT NULL DEFAULT 0,
  generations integer NOT NULL DEFAULT 0,
  population integer NOT NULL DEFAULT 0,
  hard_violations integer NOT NULL DEFAULT 0,
  soft_violations integer NOT NULL DEFAULT 0,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.generation_runs TO authenticated;
GRANT ALL ON public.generation_runs TO service_role;
ALTER TABLE public.generation_runs ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY,
  username text NOT NULL,
  full_name text,
  faculty_id uuid REFERENCES public.faculty(id) ON DELETE SET NULL,
  department text,
  section text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT, INSERT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- profiles
CREATE POLICY "own profile read" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "own profile insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "admin delete profile" ON public.profiles FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));

-- user_roles
CREATE POLICY "read own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "insert own role" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- reference data: all authenticated read, admin write
CREATE POLICY "read faculty" ON public.faculty FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin write faculty" ON public.faculty FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE POLICY "read rooms" ON public.rooms FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin write rooms" ON public.rooms FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE POLICY "read courses" ON public.courses FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin write courses" ON public.courses FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE POLICY "read semester" ON public.semester_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin write semester" ON public.semester_settings FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE POLICY "read timetable" ON public.timetable FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin write timetable" ON public.timetable FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE POLICY "read runs" ON public.generation_runs FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin write runs" ON public.generation_runs FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- Sample data
INSERT INTO public.semester_settings (semester_name, semester_start_date, semester_end_date, semester_months, teaching_weeks, period_duration_minutes)
VALUES ('2026-2027 Odd Semester','2026-07-01','2026-11-30',5,20,55);

INSERT INTO public.faculty (id, name, department, email) VALUES
 ('11111111-1111-1111-1111-111111111101','Dr. Arun Kumar','CSE','arun.kumar@college.edu'),
 ('11111111-1111-1111-1111-111111111102','Dr. Meena Raj','CSE','meena.raj@college.edu'),
 ('11111111-1111-1111-1111-111111111103','Prof. Suresh Babu','CSE','suresh.babu@college.edu'),
 ('11111111-1111-1111-1111-111111111104','Dr. Kavitha Nair','ECE','kavitha.nair@college.edu'),
 ('11111111-1111-1111-1111-111111111105','Prof. Ramesh Iyer','ECE','ramesh.iyer@college.edu'),
 ('11111111-1111-1111-1111-111111111106','Dr. Priya Sharma','EEE','priya.sharma@college.edu'),
 ('11111111-1111-1111-1111-111111111107','Prof. Vignesh Rao','MECH','vignesh.rao@college.edu');

INSERT INTO public.rooms (room_number, room_type, capacity) VALUES
 ('CSE-101','Classroom',60),('CSE-102','Classroom',70),('CSE-103','Classroom',45),
 ('ECE-201','Classroom',60),('ECE-202','Classroom',70),
 ('EEE-301','Classroom',65),('MECH-401','Classroom',70),
 ('LAB-1','Lab',60),('LAB-2','Lab',60),('LAB-3','Lab',70),('LAB-4','Lab',45);

INSERT INTO public.courses (code,name,credit,required_hours,course_type,faculty_id,department,section,student_count,room_type,periods_per_week,max_periods_per_day,consecutive_block) VALUES
 ('CSE101','Data Structures',4,60,'Theory','11111111-1111-1111-1111-111111111101','CSE','A',58,'Classroom',4,2,false),
 ('CSE102','Database Management Systems',4,60,'Theory','11111111-1111-1111-1111-111111111102','CSE','A',58,'Classroom',4,2,false),
 ('CSE103','Operating Systems',3,45,'Theory','11111111-1111-1111-1111-111111111103','CSE','A',58,'Classroom',3,1,false),
 ('CSE104','Programming Lab',2,30,'Lab','11111111-1111-1111-1111-111111111101','CSE','A',58,'Lab',4,4,true),
 ('CSE201','Computer Networks',4,60,'Theory','11111111-1111-1111-1111-111111111102','CSE','B',55,'Classroom',4,2,false),
 ('CSE202','Software Engineering',3,45,'Theory','11111111-1111-1111-1111-111111111103','CSE','B',55,'Classroom',3,1,false),
 ('CSE203','DBMS Lab',2,30,'Lab','11111111-1111-1111-1111-111111111102','CSE','B',55,'Lab',4,4,true),
 ('ECE101','Digital Electronics',4,60,'Theory','11111111-1111-1111-1111-111111111104','ECE','A',62,'Classroom',4,2,false),
 ('ECE102','Signals and Systems',3,45,'Theory','11111111-1111-1111-1111-111111111105','ECE','A',62,'Classroom',3,1,false),
 ('ECE103','Electronics Lab',2,30,'Lab','11111111-1111-1111-1111-111111111104','ECE','A',62,'Lab',4,4,true),
 ('EEE101','Electrical Machines',4,60,'Theory','11111111-1111-1111-1111-111111111106','EEE','A',63,'Classroom',4,2,false),
 ('EEE102','Power Systems',3,45,'Theory','11111111-1111-1111-1111-111111111106','EEE','A',63,'Classroom',3,1,false),
 ('MECH101','Thermodynamics',4,60,'Theory','11111111-1111-1111-1111-111111111107','MECH','A',66,'Classroom',4,2,false),
 ('MECH102','Fluid Mechanics',3,45,'Theory','11111111-1111-1111-1111-111111111107','MECH','A',66,'Classroom',3,1,false);
