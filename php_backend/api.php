<?php
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/jwt.php';

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
  http_response_code(200);
  exit();
}

function calculateUserXP(int $userId, mysqli $conn): int {
    $xp = 0;

    // 1. Attendance (+10 XP per attended, -10 XP per missed)
    $stmt = $conn->prepare("SELECT status FROM attendance_records WHERE user_id = ?");
    $stmt->bind_param('i', $userId);
    $stmt->execute();
    $res = $stmt->get_result();
    while ($r = $res->fetch_assoc()) {
        if ($r['status'] === 'attended') $xp += 10;
        else if ($r['status'] === 'missed') $xp -= 10;
    }
    $stmt->close();

    // 2. Focus Sessions (+10 XP per session)
    // Handled via xp_transactions.


    // 3. Habits (+5 XP per daily habit checkin)
    $stmt = $conn->prepare("SELECT COUNT(*) as c FROM habit_checkins WHERE user_id = ?");
    $stmt->bind_param('i', $userId);
    $stmt->execute();
    $xp += ($stmt->get_result()->fetch_assoc()['c'] ?? 0) * 5;
    $stmt->close();

    // 4. Exams (+10 base, +100 for 100% progress)
    $stmt = $conn->prepare("SELECT syllabus_progress FROM exams WHERE user_id = ?");
    $stmt->bind_param('i', $userId);
    $stmt->execute();
    $res = $stmt->get_result();
    while ($r = $res->fetch_assoc()) {
        $xp += 10; 
        if ($r['syllabus_progress'] >= 100) $xp += 100;
    }
    $stmt->close();

    // 5. XP Transactions (Bonuses, Logins, Streaks, etc.)
    $stmt = $conn->prepare("SELECT SUM(amount) as total FROM xp_transactions WHERE user_id = ?");
    $stmt->bind_param('i', $userId);
    $stmt->execute();
    $xp += ($stmt->get_result()->fetch_assoc()['total'] ?? 0);
    $stmt->close();

    return max(0, $xp);
}

function getRankInfo(int $xp): array {
    // Level Calculation: XP = 100 * (Level-1)^1.5  =>  Level = (XP/100)^(1/1.5) + 1
    $level = floor(pow($xp / 100, 1 / 1.5)) + 1;
    
    // Rank System
    $rank = "Rookie";
    $rankColor = "#94A3B8"; // Gray
    if ($level >= 1000) { $rank = "Infinite Sage"; $rankColor = "#EAB308"; } // Gold
    else if ($level >= 900) { $rank = "Divine Intellectual"; $rankColor = "#EAB308"; }
    else if ($level >= 800) { $rank = "Universal Sage"; $rankColor = "#EAB308"; }
    else if ($level >= 700) { $rank = "Cosmic Overlord"; $rankColor = "#EAB308"; }
    else if ($level >= 600) { $rank = "Eternal Grandmaster"; $rankColor = "#EAB308"; }
    else if ($level >= 500) { $rank = "Mythic Scholar"; $rankColor = "#EAB308"; }
    else if ($level >= 450) { $rank = "Ascended Genius"; $rankColor = "#EAB308"; }
    else if ($level >= 400) { $rank = "Omniscient Mind"; $rankColor = "#EAB308"; }
    else if ($level >= 350) { $rank = "Infinite Guardian"; $rankColor = "#EAB308"; }
    else if ($level >= 300) { $rank = "Supreme Scholar"; $rankColor = "#EAB308"; }
    else if ($level >= 250) { $rank = "Grandmaster"; $rankColor = "#EAB308"; }
    else if ($level >= 200) { $rank = "Divine Sage"; $rankColor = "#F59E0B"; } // Orange/Amber
    else if ($level >= 180) { $rank = "Cosmic Strategist"; $rankColor = "#F59E0B"; }
    else if ($level >= 160) { $rank = "Eternal Thinker"; $rankColor = "#F59E0B"; }
    else if ($level >= 140) { $rank = "Celestial Scholar"; $rankColor = "#F59E0B"; }
    else if ($level >= 120) { $rank = "Mythic Warrior"; $rankColor = "#F59E0B"; }
    else if ($level >= 100) { $rank = "Grand Scholar"; $rankColor = "#F59E0B"; }
    else if ($level >= 95) { $rank = "Wisdom Titan"; $rankColor = "#EC4899"; } // Pink/Rose
    else if ($level >= 90) { $rank = "Knowledge Titan"; $rankColor = "#EC4899"; }
    else if ($level >= 85) { $rank = "Brain Titan"; $rankColor = "#EC4899"; }
    else if ($level >= 80) { $rank = "Focus Titan"; $rankColor = "#EC4899"; }
    else if ($level >= 75) { $rank = "Academic Titan"; $rankColor = "#EC4899"; }
    else if ($level >= 70) { $rank = "Study Legend"; $rankColor = "#EC4899"; }
    else if ($level >= 65) { $rank = "Wisdom Legend"; $rankColor = "#EC4899"; }
    else if ($level >= 60) { $rank = "Logic Legend"; $rankColor = "#EC4899"; }
    else if ($level >= 55) { $rank = "Mind Conqueror"; $rankColor = "#EC4899"; }
    else if ($level >= 50) { $rank = "Academic Elite"; $rankColor = "#EC4899"; }
    else if ($level == 49) { $rank = "Wisdom Elite"; $rankColor = "#8B5CF6"; } // Purple
    else if ($level == 48) { $rank = "Knowledge Elite"; $rankColor = "#8B5CF6"; }
    else if ($level == 47) { $rank = "Study Elite"; $rankColor = "#8B5CF6"; }
    else if ($level == 46) { $rank = "Focus Elite"; $rankColor = "#8B5CF6"; }
    else if ($level == 45) { $rank = "Academic Elite"; $rankColor = "#8B5CF6"; }
    else if ($level == 44) { $rank = "Brain Master"; $rankColor = "#8B5CF6"; }
    else if ($level == 43) { $rank = "Logic Master"; $rankColor = "#8B5CF6"; }
    else if ($level == 42) { $rank = "Knowledge Master"; $rankColor = "#8B5CF6"; }
    else if ($level == 41) { $rank = "Wisdom Master"; $rankColor = "#8B5CF6"; }
    else if ($level == 40) { $rank = "Learning Master"; $rankColor = "#8B5CF6"; }
    else if ($level == 39) { $rank = "Study Vanguard"; $rankColor = "#06B6D4"; } // Cyan/Teal
    else if ($level == 38) { $rank = "Focus Guardian"; $rankColor = "#06B6D4"; }
    else if ($level == 37) { $rank = "Brain Guardian"; $rankColor = "#06B6D4"; }
    else if ($level == 36) { $rank = "Logic Guardian"; $rankColor = "#06B6D4"; }
    else if ($level == 35) { $rank = "Academic Guardian"; $rankColor = "#06B6D4"; }
    else if ($level == 34) { $rank = "Study Commander"; $rankColor = "#06B6D4"; }
    else if ($level == 33) { $rank = "Wisdom Commander"; $rankColor = "#06B6D4"; }
    else if ($level == 32) { $rank = "Knowledge Commander"; $rankColor = "#06B6D4"; }
    else if ($level == 31) { $rank = "Brain Strategist"; $rankColor = "#06B6D4"; }
    else if ($level == 30) { $rank = "Focus Knight"; $rankColor = "#06B6D4"; }
    else if ($level == 29) { $rank = "Mind Strategist"; $rankColor = "#3B82F6"; } // Blue
    else if ($level == 28) { $rank = "Learning Champion"; $rankColor = "#3B82F6"; }
    else if ($level == 27) { $rank = "Study Champion"; $rankColor = "#3B82F6"; }
    else if ($level == 26) { $rank = "Brain Champion"; $rankColor = "#3B82F6"; }
    else if ($level == 25) { $rank = "Focus Champion"; $rankColor = "#3B82F6"; }
    else if ($level == 24) { $rank = "Academic Expert"; $rankColor = "#3B82F6"; }
    else if ($level == 23) { $rank = "Wisdom Expert"; $rankColor = "#3B82F6"; }
    else if ($level == 22) { $rank = "Knowledge Expert"; $rankColor = "#3B82F6"; }
    else if ($level == 21) { $rank = "Logic Expert"; $rankColor = "#3B82F6"; }
    else if ($level == 20) { $rank = "Study Warrior"; $rankColor = "#3B82F6"; }
    else if ($level == 19) { $rank = "Focus Warrior"; $rankColor = "#22C55E"; } // Green
    else if ($level == 18) { $rank = "Academic Warrior"; $rankColor = "#22C55E"; }
    else if ($level == 17) { $rank = "Mind Guardian"; $rankColor = "#22C55E"; }
    else if ($level == 16) { $rank = "Knowledge Fighter"; $rankColor = "#22C55E"; }
    else if ($level == 15) { $rank = "Study Knight"; $rankColor = "#22C55E"; }
    else if ($level == 14) { $rank = "Wisdom Seeker"; $rankColor = "#22C55E"; }
    else if ($level == 13) { $rank = "Brain Worker"; $rankColor = "#22C55E"; }
    else if ($level == 12) { $rank = "Focus Builder"; $rankColor = "#22C55E"; }
    else if ($level == 11) { $rank = "Logic Learner"; $rankColor = "#22C55E"; }
    else if ($level == 10) { $rank = "Scholar"; $rankColor = "#22C55E"; }
    else if ($level == 9) { $rank = "Academic Starter"; $rankColor = "#94A3B8"; } // Gray
    else if ($level == 8) { $rank = "Mind Explorer"; $rankColor = "#94A3B8"; }
    else if ($level == 7) { $rank = "Thinker"; $rankColor = "#94A3B8"; }
    else if ($level == 6) { $rank = "Study Trainee"; $rankColor = "#94A3B8"; }
    else if ($level == 5) { $rank = "Knowledge Seeker"; $rankColor = "#94A3B8"; }
    else if ($level == 4) { $rank = "Explorer"; $rankColor = "#94A3B8"; }
    else if ($level == 3) { $rank = "Learner"; $rankColor = "#94A3B8"; }
    else if ($level == 2) { $rank = "Beginner"; $rankColor = "#94A3B8"; }
    else { $rank = "Rookie"; $rankColor = "#94A3B8"; }

    return ['level' => $level, 'rank' => $rank, 'rankColor' => $rankColor];
}

$action = $_GET['action'] ?? '';
$body = json_decode(file_get_contents('php://input'), true) ?? [];

function ok($data = null) {
  echo json_encode(['success' => true, 'data' => $data]);
  exit();
}
function err(string $message, int $status = 400, $data = null): never {
  http_response_code($status);
  echo json_encode(['success' => false, 'message' => $message, 'data' => $data]);
  exit();
}

// JWT auth payload
$payload = [];
require_auth($payload, $conn);
$userId = intval($payload['sub']);

switch ($action) {
  // =========================
  // Profiles / Settings
  // =========================
  case 'getProfile': {
    $stmt = $conn->prepare('SELECT uid, full_name, email, avatar_url, gender, theme_preference, attendance_target, goals, study_start, study_end, onboarded, updated_at, created_at, subscription_plan FROM users WHERE id = ? LIMIT 1');
    $stmt->bind_param('i', $userId);
    $stmt->execute();
    $res = $stmt->get_result();
    if ($res->num_rows === 0) err('Profile not found', 404);
    $profile = $res->fetch_assoc();

    $createdAt = new DateTime($profile['created_at']);
    $nowDate = new DateTime();
    $daysSinceCreation = $nowDate->diff($createdAt)->days;
    $daysLeft = max(0, 9 - $daysSinceCreation);
    $trialExpired = false;

    $xp = calculateUserXP($userId, $conn);
    $rInfo = getRankInfo($xp);

    // Calculate streak (consecutive days with any activity: attendance or habit checkin)
    $stmt = $conn->prepare("
        (SELECT date FROM attendance_records WHERE user_id = ?)
        UNION
        (SELECT date FROM habit_checkins WHERE user_id = ?)
        ORDER BY date DESC
    ");
    $stmt->bind_param('ii', $userId, $userId);
    $stmt->execute();
    $resDates = $stmt->get_result();
    $streak = 0;
    $curr = new DateTime();
    $curr->setTime(0,0,0);
    $lastDate = null;
    
    while ($row = $resDates->fetch_assoc()) {
        $d = new DateTime($row['date']);
        $d->setTime(0,0,0);
        if ($lastDate === null) {
            $diff = $curr->diff($d)->days;
            if ($diff <= 1) { // Today or yesterday
                $streak = 1;
                $lastDate = $d;
            } else {
                break; // Streak broken
            }
        } else {
            $diff = $lastDate->diff($d)->days;
            if ($diff == 1) {
                $streak++;
                $lastDate = $d;
            } else if ($diff == 0) {
                continue; // Multiple activities on same day
            } else {
                break;
            }
        }
    }
    $stmt->close();

    $profile['xp'] = $xp;
    $profile['level'] = $rInfo['level'];
    $profile['rank'] = $rInfo['rank'];
    $profile['rank_color'] = $rInfo['rankColor'];
    $profile['coins'] = $profile['coins'] ?? 0;
    $profile['streak'] = $streak;
    $profile['trial_expired'] = $trialExpired;
    $profile['days_left'] = $daysLeft;
    $profile['subscription_plan'] = $profile['subscription_plan'];

    ok(['profile' => $profile]);
  }

  case 'choosePlan': {
    $plan = $body['plan'] ?? 'basic';
    $stmt = $conn->prepare('UPDATE users SET subscription_plan = ? WHERE id = ?');
    $stmt->bind_param('si', $plan, $userId);
    if ($stmt->execute()) {
        ok(['success' => true]);
    } else {
        err('Failed to update plan');
    }
  }

  case 'updateProfile': {
    $full_name = $body['full_name'] ?? null;
    $avatar_url = $body['avatar_url'] ?? null;
    $gender = $body['gender'] ?? null;
    $theme_preference = $body['theme_preference'] ?? null;
    $attendance_target = $body['attendance_target'] ?? null;
    $study_start = $body['study_start'] ?? null;
    $study_end = $body['study_end'] ?? null;
    $goals = $body['goals'] ?? null;
    $target_exam_title = $body['target_exam_title'] ?? null; // not in users table, ignore
    $onboarded = $body['onboarded'] ?? null;

    $fields = [];
    $types = '';
    $params = [];

    $map = [
      'full_name' => $full_name,
      'avatar_url' => $avatar_url,
      'gender' => $gender,
      'theme_preference' => $theme_preference,
      'attendance_target' => $attendance_target,
      'study_start' => $study_start,
      'study_end' => $study_end,
      'goals' => $goals,
      'onboarded' => $onboarded,
    ];

    foreach ($map as $col => $val) {
      if ($val === null) continue;
      $fields[] = "$col = ?";
      // crude typing
      if (is_int($val)) { $types .= 'i'; }
      elseif (is_bool($val)) { $types .= 'i'; $val = $val ? 1 : 0; }
      else { $types .= 's'; }
      $params[] = $val;
    }

    if (count($fields) === 0) ok((object)[]);

    $sql = 'UPDATE users SET ' . implode(', ', $fields) . ', updated_at = NOW() WHERE id = ?';
    $types .= 'i';
    $params[] = $userId;

    $stmt = $conn->prepare($sql);
    $stmt->bind_param($types, ...$params);
    $stmt->execute();
    ok((object)[]);
  }

  // =========================
  // Subjects
  // =========================
  case 'getSubjects': {
    $stmt = $conn->prepare('SELECT id, name, color, attendance_target FROM subjects WHERE user_id = ? ORDER BY name ASC');
    $stmt->bind_param('i', $userId);
    $stmt->execute();
    $res = $stmt->get_result();
    $subjects = [];
    while ($row = $res->fetch_assoc()) $subjects[] = $row;
    ok(['subjects' => $subjects]);
  }

  case 'addSubject': {
    $payloadName = $body['name'] ?? '';
    $color = $body['color'] ?? '#f59e0b';
    $attendance_target = $body['attendance_target'] ?? 75;

    $name = trim($payloadName);
    if ($name === '') err('Subject name required');

    $id = bin2hex(random_bytes(16));

    $stmt = $conn->prepare('INSERT INTO subjects (id, user_id, name, color, attendance_target) VALUES (?, ?, ?, ?, ?)');
    $stmt->bind_param('sissi', $id, $userId, $name, $color, $attendance_target);
    $stmt->execute();
    ok(['id' => $id]);
  }

  case 'updateSubject': {
    $subjectId = $body['subjectId'] ?? '';
    if (!$subjectId) err('Missing subjectId');

    // payload contains {name,color,attendance_target}
    $p = $body['payload'] ?? [];

    $fields = [];
    $types = '';
    $params = [];

    $map = [
      'name' => $p['name'] ?? null,
      'color' => $p['color'] ?? null,
      'attendance_target' => $p['attendance_target'] ?? null,
    ];

    foreach ($map as $col => $val) {
      if ($val === null) continue;
      $fields[] = "$col = ?";
      if (is_int($val)) $types .= 'i'; else $types .= 's';
      $params[] = $val;
    }

    if (count($fields) === 0) ok((object)[]);

    $sql = 'UPDATE subjects SET ' . implode(', ', $fields) . ', updated_at = NOW() WHERE id = ? AND user_id = ?';
    $types .= 'si';
    $params[] = $subjectId;
    $params[] = $userId;

    $stmt = $conn->prepare($sql);
    $stmt->bind_param($types, ...$params);
    $stmt->execute();
    ok((object)[]);
  }

  case 'deleteSubject': {
    $subjectId = $body['subjectId'] ?? '';
    if (!$subjectId) err('Missing subjectId');

    $stmt = $conn->prepare('DELETE FROM subjects WHERE id = ? AND user_id = ?');
    $stmt->bind_param('si', $subjectId, $userId);
    $stmt->execute();
    ok((object)[]);
  }

  // =========================
  // Attendance
  // =========================
  case 'getAttendanceRecords': {
    $stmt = $conn->prepare('SELECT id, subject_id, block_id, date, status, note, created_at FROM attendance_records WHERE user_id = ? ORDER BY date DESC, created_at DESC LIMIT 500');
    $stmt->bind_param('i', $userId);
    $stmt->execute();
    $res = $stmt->get_result();
    $rows = [];
    while ($row = $res->fetch_assoc()) $rows[] = $row;
    ok(['records' => $rows]);
  }

  case 'addAttendanceRecord': {
    $subjectId = $body['subjectId'] ?? null;
    $blockId = $body['blockId'] ?? null;
    $status = $body['status'] ?? '';
    $date = $body['date'] ?? '';
    $note = $body['note'] ?? null;
    if (!$status || !$date) err('Missing status/date');

    // If blockId is provided, check if record already exists for this block and date
    if ($blockId) {
        $check = $conn->prepare('SELECT id FROM attendance_records WHERE user_id = ? AND block_id = ? AND date = ?');
        $check->bind_param('iss', $userId, $blockId, $date);
        $check->execute();
        $res = $check->get_result();
        if ($res->num_rows > 0) {
            $existingId = $res->fetch_assoc()['id'];
            $upd = $conn->prepare('UPDATE attendance_records SET status = ?, note = ? WHERE id = ?');
            $upd->bind_param('sss', $status, $note, $existingId);
            $upd->execute();
            ok(['id' => $existingId]);
        }
    }

    $id = bin2hex(random_bytes(16));
    $sId = $subjectId === 'null' ? null : $subjectId;

    $stmt = $conn->prepare('INSERT INTO attendance_records (id, user_id, subject_id, block_id, date, status, note) VALUES (?, ?, ?, ?, ?, ?, ?)');
    $stmt->bind_param('sisssss', $id, $userId, $sId, $blockId, $date, $status, $note);
    $stmt->execute();
    ok((object)[]);
  }

  case 'deleteAttendanceRecord': {
    $recordId = $body['recordId'] ?? '';
    if (!$recordId) err('Missing recordId');
    $stmt = $conn->prepare('DELETE FROM attendance_records WHERE id = ? AND user_id = ?');
    $stmt->bind_param('si', $recordId, $userId);
    $stmt->execute();
    ok((object)[]);
  }

  // =========================
  // Routine Blocks
  // =========================
  case 'getRoutineBlocks': {
    $stmt = $conn->prepare('SELECT * FROM routine_blocks WHERE user_id = ? ORDER BY day_of_week ASC, start_time ASC');
    $stmt->bind_param('i', $userId);
    $stmt->execute();
    $res = $stmt->get_result();
    $rows = [];
    while ($row = $res->fetch_assoc()) $rows[] = $row;
    ok(['blocks' => $rows]);
  }
  case 'addRoutineBlock': {
    $id = bin2hex(random_bytes(16));
    $day = $body['day_of_week'] ?? 0;
    $start = $body['start_time'] ?? '';
    $end = $body['end_time'] ?? '';
    $type = $body['block_type'] ?? 'study';
    $title = $body['title'] ?? '';
    $sub = $body['subject_id'] ?? null;
    $col = $body['color'] ?? null;
    $stmt = $conn->prepare('INSERT INTO routine_blocks (id, user_id, day_of_week, start_time, end_time, block_type, title, subject_id, color) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
    $stmt->bind_param('siissssss', $id, $userId, $day, $start, $end, $type, $title, $sub, $col);
    $stmt->execute();
    ok(['id' => $id]);
  }
  case 'syncRoutineBlocks': {
    // This expects { anchors: [], blocks: [] }
    // It will replace all existing blocks for the user.
    $anchors = $body['anchors'] ?? [];
    $custom = $body['blocks'] ?? [];
    
    // Start transaction
    $conn->begin_transaction();
    try {
        // Delete all existing blocks for this user
        $stmt = $conn->prepare('DELETE FROM routine_blocks WHERE user_id = ?');
        $stmt->bind_param('i', $userId);
        $stmt->execute();

        // Insert anchors
        $stmt = $conn->prepare('INSERT INTO routine_blocks (id, user_id, day_of_week, start_time, end_time, block_type, title, subject_id, color) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
        foreach (array_merge($anchors, $custom) as $b) {
            $id = $b['id'] ?? bin2hex(random_bytes(16));
            if (strpos($id, 'ai_') === 0) $id = bin2hex(random_bytes(16)); // Replace temporary AI IDs
            $day = $b['day_of_week'] ?? 0;
            $start = $b['start_time'];
            $end = $b['end_time'];
            $type = $b['block_type'] ?? 'study';
            $title = $b['title'];
            $sub = $b['subject_id'] ?? null;
            $col = $b['color'] ?? null;
            $stmt->bind_param('siissssss', $id, $userId, $day, $start, $end, $type, $title, $sub, $col);
            $stmt->execute();
        }
        $conn->commit();
        ok(['success' => true]);
    } catch (Exception $e) {
        $conn->rollback();
        err($e->getMessage());
    }
  }

  case 'deleteRoutineBlock': {
    $id = $body['id'] ?? '';
    $stmt = $conn->prepare('DELETE FROM routine_blocks WHERE id = ? AND user_id = ?');
    $stmt->bind_param('si', $id, $userId);
    $stmt->execute();
    ok((object)[]);
  }
  case 'updateRoutineBlock': {
    $id = $body['id'] ?? '';
    $day = $body['day_of_week'] ?? null;
    $start = $body['start_time'] ?? null;
    $end = $body['end_time'] ?? null;
    $type = $body['block_type'] ?? null;
    $title = $body['title'] ?? null;
    $sub = $body['subject_id'] ?? null;
    $col = $body['color'] ?? null;

    $fields = [];
    $types = '';
    $params = [];

    $map = [
      'day_of_week' => $day,
      'start_time' => $start,
      'end_time' => $end,
      'block_type' => $type,
      'title' => $title,
      'subject_id' => $sub,
      'color' => $col,
    ];

    foreach ($map as $c => $v) {
      if ($v === null) continue;
      $fields[] = "$c = ?";
      if (is_int($v)) $types .= 'i'; else $types .= 's';
      $params[] = $v;
    }

    if (count($fields) > 0) {
      $sql = 'UPDATE routine_blocks SET ' . implode(', ', $fields) . ' WHERE id = ? AND user_id = ?';
      $types .= 'si';
      $params[] = $id;
      $params[] = $userId;
      $stmt = $conn->prepare($sql);
      $stmt->bind_param($types, ...$params);
      $stmt->execute();
    }
    ok((object)[]);
  }

  // =========================
  // Exams
  // =========================
  case 'getExams': {
    $stmt = $conn->prepare('SELECT * FROM exams WHERE user_id = ? ORDER BY exam_date ASC');
    $stmt->bind_param('i', $userId);
    $stmt->execute();
    $res = $stmt->get_result();
    $rows = [];
    while ($row = $res->fetch_assoc()) $rows[] = $row;
    ok(['exams' => $rows]);
  }
  case 'addExam': {
    $id = bin2hex(random_bytes(16));
    $title = $body['title'] ?? '';
    $sub = $body['subject_id'] ?? null;
    $date = $body['exam_date'] ?? '';
    $prog = $body['syllabus_progress'] ?? 0;
    $notes = $body['notes'] ?? null;
    $stmt = $conn->prepare('INSERT INTO exams (id, user_id, title, subject_id, exam_date, syllabus_progress, notes) VALUES (?, ?, ?, ?, ?, ?, ?)');
    $stmt->bind_param('sisssis', $id, $userId, $title, $sub, $date, $prog, $notes);
    $stmt->execute();
    ok(['id' => $id]);
  }
  case 'updateExam': {
    $id = $body['id'] ?? '';
    $prog = $body['syllabus_progress'] ?? 0;
    $stmt = $conn->prepare('UPDATE exams SET syllabus_progress = ? WHERE id = ? AND user_id = ?');
    $stmt->bind_param('isi', $prog, $id, $userId);
    $stmt->execute();
    ok((object)[]);
  }
  case 'deleteExam': {
    $id = $body['id'] ?? '';
    $stmt = $conn->prepare('DELETE FROM exams WHERE id = ? AND user_id = ?');
    $stmt->bind_param('si', $id, $userId);
    $stmt->execute();
    ok((object)[]);
  }
  case 'getSyllabusItems': {
    $stmt = $conn->prepare('SELECT * FROM exam_syllabus_items WHERE user_id = ? ORDER BY created_at ASC');
    $stmt->bind_param('i', $userId);
    $stmt->execute();
    $res = $stmt->get_result();
    $rows = [];
    while ($row = $res->fetch_assoc()) $rows[] = $row;
    ok(['items' => $rows]);
  }
  case 'addSyllabusItem': {
    $id = bin2hex(random_bytes(16));
    $examId = $body['exam_id'] ?? '';
    $chapter = $body['chapter'] ?? '';
    $completed = $body['completed'] ?? false;
    $cInt = $completed ? 1 : 0;
    $stmt = $conn->prepare('INSERT INTO exam_syllabus_items (id, user_id, exam_id, chapter, completed) VALUES (?, ?, ?, ?, ?)');
    $stmt->bind_param('sissi', $id, $userId, $examId, $chapter, $cInt);
    $stmt->execute();
    // fetch back the row to return
    $stmt2 = $conn->prepare('SELECT * FROM exam_syllabus_items WHERE id = ?');
    $stmt2->bind_param('s', $id);
    $stmt2->execute();
    $row = $stmt2->get_result()->fetch_assoc();
    ok($row);
  }
  case 'updateSyllabusItem': {
    $id = $body['id'] ?? '';
    $completed = $body['completed'] ?? false;
    $cInt = $completed ? 1 : 0;
    $stmt = $conn->prepare('UPDATE exam_syllabus_items SET completed = ? WHERE id = ? AND user_id = ?');
    $stmt->bind_param('isi', $cInt, $id, $userId);
    $stmt->execute();
    ok((object)[]);
  }
  case 'deleteSyllabusItem': {
    $id = $body['id'] ?? '';
    $stmt = $conn->prepare('DELETE FROM exam_syllabus_items WHERE id = ? AND user_id = ?');
    $stmt->bind_param('si', $id, $userId);
    $stmt->execute();
    ok((object)[]);
  }

  // =========================
  // Habits
  // =========================
  case 'getHabits': {
    $stmt = $conn->prepare('SELECT * FROM habits WHERE user_id = ?');
    $stmt->bind_param('i', $userId);
    $stmt->execute();
    $res = $stmt->get_result();
    $rows = [];
    while ($row = $res->fetch_assoc()) $rows[] = $row;
    ok(['habits' => $rows]);
  }
  case 'addHabit': {
    $id = bin2hex(random_bytes(16));
    $name = $body['name'] ?? '';
    $color = $body['color'] ?? null;
    $icon = $body['icon'] ?? null;
    $target = $body['target_per_week'] ?? 0;
    $stmt = $conn->prepare('INSERT INTO habits (id, user_id, name, color, icon, target_per_week) VALUES (?, ?, ?, ?, ?, ?)');
    $stmt->bind_param('sisssi', $id, $userId, $name, $color, $icon, $target);
    $stmt->execute();
    ok(['id' => $id]);
  }
  case 'deleteHabit': {
    $id = $body['id'] ?? '';
    $stmt = $conn->prepare('DELETE FROM habits WHERE id = ? AND user_id = ?');
    $stmt->bind_param('si', $id, $userId);
    $stmt->execute();
    ok((object)[]);
  }
  case 'getHabitCheckins': {
    $stmt = $conn->prepare('SELECT * FROM habit_checkins WHERE user_id = ?');
    $stmt->bind_param('i', $userId);
    $stmt->execute();
    $res = $stmt->get_result();
    $rows = [];
    while ($row = $res->fetch_assoc()) $rows[] = $row;
    ok(['checkins' => $rows]);
  }
  case 'addHabitCheckin': {
    $id = bin2hex(random_bytes(16));
    $hid = $body['habit_id'] ?? '';
    $date = $body['date'] ?? '';
    $stmt = $conn->prepare('INSERT INTO habit_checkins (id, user_id, habit_id, date) VALUES (?, ?, ?, ?)');
    $stmt->bind_param('siss', $id, $userId, $hid, $date);
    $stmt->execute();
    ok(['id' => $id]);
  }
  case 'deleteHabitCheckin': {
    $id = $body['id'] ?? '';
    $stmt = $conn->prepare('DELETE FROM habit_checkins WHERE id = ? AND user_id = ?');
    $stmt->bind_param('si', $id, $userId);
    $stmt->execute();
    ok((object)[]);
  }

  // =========================
  // Notes
  // =========================
  case 'getNotes': {
    $stmt = $conn->prepare('SELECT * FROM notes WHERE user_id = ? ORDER BY updated_at DESC');
    $stmt->bind_param('i', $userId);
    $stmt->execute();
    $res = $stmt->get_result();
    $rows = [];
    while ($row = $res->fetch_assoc()) $rows[] = $row;
    ok(['notes' => $rows]);
  }
  case 'addNote': {
    $id = bin2hex(random_bytes(16));
    $title = $body['title'] ?? '';
    $content = $body['content'] ?? '';
    $sub = $body['subject_id'] ?? null;
    $stmt = $conn->prepare('INSERT INTO notes (id, user_id, title, content, subject_id) VALUES (?, ?, ?, ?, ?)');
    $stmt->bind_param('sisss', $id, $userId, $title, $content, $sub);
    $stmt->execute();
    ok(['id' => $id]);
  }
  case 'deleteNote': {
    $id = $body['id'] ?? '';
    $stmt = $conn->prepare('DELETE FROM notes WHERE id = ? AND user_id = ?');
    $stmt->bind_param('si', $id, $userId);
    $stmt->execute();
    ok((object)[]);
  }
  case 'updateNote': {
    $id = $body['id'] ?? '';
    $title = $body['title'] ?? null;
    $content = $body['content'] ?? null;
    $sub = $body['subject_id'] ?? null;
    $pinned = $body['pinned'] ?? null;

    $fields = [];
    $types = '';
    $params = [];

    $map = [
      'title' => $title,
      'content' => $content,
      'subject_id' => $sub,
      'pinned' => $pinned === null ? null : ($pinned ? 1 : 0),
    ];

    foreach ($map as $c => $v) {
      if ($v === null) continue;
      $fields[] = "$c = ?";
      if (is_int($v)) $types .= 'i'; else $types .= 's';
      $params[] = $v;
    }

    if (count($fields) > 0) {
      $sql = 'UPDATE notes SET ' . implode(', ', $fields) . ' WHERE id = ? AND user_id = ?';
      $types .= 'si';
      $params[] = $id;
      $params[] = $userId;
      $stmt = $conn->prepare($sql);
      $stmt->bind_param($types, ...$params);
      $stmt->execute();
    }
    ok((object)[]);
  }

  // =========================
  // Practice Logs
  // =========================
  case 'getPracticeLogs': {
    $stmt = $conn->prepare('SELECT * FROM practice_logs WHERE user_id = ? ORDER BY log_date DESC');
    $stmt->bind_param('i', $userId);
    $stmt->execute();
    $res = $stmt->get_result();
    $rows = [];
    while ($row = $res->fetch_assoc()) $rows[] = $row;
    ok(['logs' => $rows]);
  }
  case 'addPracticeLog': {
    $id = bin2hex(random_bytes(16));
    $subId = $body['subject_id'] ?? null;
    $subName = $body['subject_name'] ?? '';
    $chap = $body['chapter'] ?? '';
    $date = $body['log_date'] ?? '';
    $diff = $body['difficulty'] ?? '';
    $mins = $body['time_minutes'] ?? 0;
    $att = $body['attempted'] ?? 0;
    $cor = $body['correct'] ?? 0;
    $wro = $body['wrong'] ?? 0;
    $stmt = $conn->prepare('INSERT INTO practice_logs (id, user_id, subject_id, subject_name, chapter, log_date, difficulty, time_minutes, attempted, correct, wrong) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
    $stmt->bind_param('sisssssiiii', $id, $userId, $subId, $subName, $chap, $date, $diff, $mins, $att, $cor, $wro);
    $stmt->execute();
    ok(['id' => $id]);
  }
  case 'deletePracticeLog': {
    $id = $body['id'] ?? '';
    $stmt = $conn->prepare('DELETE FROM practice_logs WHERE id = ? AND user_id = ?');
    $stmt->bind_param('si', $id, $userId);
    $stmt->execute();
    ok((object)[]);
  }

  // =========================
  // Revisions
  // =========================
  case 'getRevisions': {
    $stmt = $conn->prepare('SELECT * FROM revision_items WHERE user_id = ? ORDER BY due_date ASC');
    $stmt->bind_param('i', $userId);
    $stmt->execute();
    $res = $stmt->get_result();
    $rows = [];
    while ($row = $res->fetch_assoc()) $rows[] = $row;
    ok(['revisions' => $rows]);
  }
  case 'addRevision': {
    $id = bin2hex(random_bytes(16));
    $subId = $body['subject_id'] ?? null;
    $subName = $body['subject_name'] ?? '';
    $chap = $body['chapter'] ?? '';
    $date = $body['due_date'] ?? '';
    $status = $body['status'] ?? 'pending';
    $inv = $body['interval_days'] ?? 0;
    $stmt = $conn->prepare('INSERT INTO revision_items (id, user_id, subject_id, subject_name, chapter, due_date, status, interval_days) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
    $stmt->bind_param('sisssssi', $id, $userId, $subId, $subName, $chap, $date, $status, $inv);
    $stmt->execute();
    ok(['id' => $id]);
  }
  case 'updateRevision': {
    $id = $body['id'] ?? '';
    $date = $body['due_date'] ?? '';
    $status = $body['status'] ?? '';
    $inv = $body['interval_days'] ?? 0;
    $last = $body['last_reviewed_at'] ?? null;
    $stmt = $conn->prepare('UPDATE revision_items SET due_date = ?, status = ?, interval_days = ?, last_reviewed_at = ? WHERE id = ? AND user_id = ?');
    $stmt->bind_param('ssissi', $date, $status, $inv, $last, $id, $userId);
    $stmt->execute();
    ok((object)[]);
  }
  case 'deleteRevision': {
    $id = $body['id'] ?? '';
    $stmt = $conn->prepare('DELETE FROM revision_items WHERE id = ? AND user_id = ?');
    $stmt->bind_param('si', $id, $userId);
    $stmt->execute();
    ok((object)[]);
  }

  // =========================
  // Focus Sessions
  // =========================
  case 'addFocusSession': {
    $subjectId = $body['subjectId'] ?? null;
    $blockId = $body['blockId'] ?? null;
    $startedAt = $body['startedAt'] ?? '';
    $endedAt = $body['endedAt'] ?? '';
    $durationSeconds = $body['durationSeconds'] ?? 0;
    $sessionType = $body['sessionType'] ?? 'focus';
    $completed = $body['completed'] ?? false;
    
    // convert ISO to SQL DATETIME
    $sAt = substr(str_replace('T', ' ', $startedAt), 0, 19);
    $eAt = substr(str_replace('T', ' ', $endedAt), 0, 19);

    $id = bin2hex(random_bytes(16));
    $compInt = $completed ? 1 : 0;

    $stmt = $conn->prepare('INSERT INTO focus_sessions (id, user_id, subject_id, block_id, session_type, duration_seconds, started_at, ended_at, completed) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
    $stmt->bind_param('sisssissi', $id, $userId, $subjectId, $blockId, $sessionType, $durationSeconds, $sAt, $eAt, $compInt);
    $stmt->execute();

    // Also add to xp_transactions for better tracking
    if ($completed) {
      $amount = ($sessionType === 'focus') ? 10 : 5;
      $reason = ($sessionType === 'focus') ? "Pomodoro Session" : "Rest & Recharge";
      
      $txStmt = $conn->prepare("INSERT INTO xp_transactions (user_id, amount, reason) VALUES (?, ?, ?)");
      $txStmt->bind_param("iis", $userId, $amount, $reason);
      $txStmt->execute();
      $txStmt->close();

      // If it's a focus session linked to a routine block, mark attendance!
      if ($sessionType === 'focus' && $blockId) {
          $today = date('Y-m-d');
          // Check if already attended to avoid duplicates
          $checkAtt = $conn->prepare("SELECT id FROM attendance_records WHERE user_id = ? AND block_id = ? AND date = ?");
          $checkAtt->bind_param("iss", $userId, $blockId, $today);
          $checkAtt->execute();
          if ($checkAtt->get_result()->num_rows === 0) {
              $attId = bin2hex(random_bytes(16));
              $insAtt = $conn->prepare("INSERT INTO attendance_records (id, user_id, subject_id, block_id, date, status) VALUES (?, ?, ?, ?, ?, 'attended')");
              $insAtt->bind_param("sisss", $attId, $userId, $subjectId, $blockId, $today);
              $insAtt->execute();
              $insAtt->close();
          }
          $checkAtt->close();
      }
    }

    $newTotalXp = calculateUserXP($userId, $conn);
    ok(['id' => $id, 'xp_earned' => ($completed ? (($sessionType === 'focus') ? 10 : 5) : 0), 'new_total_xp' => $newTotalXp]);
  }

  // =========================
  // Analytics
  // =========================
  case 'getAnalyticsSummary': {
    $sinceIso = $body['sinceIso'] ?? date('Y-m-d H:i:s', strtotime('-30 days'));
    $sinceDate = substr($sinceIso, 0, 10);

    // subjects
    $subjects = [];
    $stmt = $conn->prepare('SELECT id, name, color FROM subjects WHERE user_id = ?');
    $stmt->bind_param('i', $userId);
    $stmt->execute();
    $res = $stmt->get_result();
    while ($r = $res->fetch_assoc()) $subjects[] = $r;

    // focus_sessions
    $sessions = [];
    $stmt = $conn->prepare('SELECT duration_seconds, subject_id, started_at, session_type, completed FROM focus_sessions WHERE user_id = ? AND started_at >= ?');
    $stmt->bind_param('is', $userId, $sinceIso);
    $stmt->execute();
    $res = $stmt->get_result();
    while ($r = $res->fetch_assoc()) {
        $r['completed'] = (bool)$r['completed'];
        $sessions[] = $r;
    }

    // attendance
    $att = [];
    $stmt = $conn->prepare('SELECT subject_id, status, date FROM attendance_records WHERE user_id = ?');
    $stmt->bind_param('i', $userId);
    $stmt->execute();
    $res = $stmt->get_result();
    while ($r = $res->fetch_assoc()) $att[] = $r;

    // habits
    $habits = [];
    $stmt = $conn->prepare('SELECT id, name, color FROM habits WHERE user_id = ?');
    $stmt->bind_param('i', $userId);
    $stmt->execute();
    $res = $stmt->get_result();
    while ($r = $res->fetch_assoc()) $habits[] = $r;

    // habit checkins
    $hcs = [];
    $stmt = $conn->prepare('SELECT habit_id, date FROM habit_checkins WHERE user_id = ? AND date >= ?');
    $stmt->bind_param('is', $userId, $sinceDate);
    $stmt->execute();
    $res = $stmt->get_result();
    while ($r = $res->fetch_assoc()) $hcs[] = $r;

    // exams count
    $stmt = $conn->prepare('SELECT COUNT(*) as c FROM exams WHERE user_id = ?');
    $stmt->bind_param('i', $userId);
    $stmt->execute();
    $examsCount = $stmt->get_result()->fetch_assoc()['c'] ?? 0;

    // notes count
    $stmt = $conn->prepare('SELECT COUNT(*) as c FROM notes WHERE user_id = ?');
    $stmt->bind_param('i', $userId);
    $stmt->execute();
    $notesCount = $stmt->get_result()->fetch_assoc()['c'] ?? 0;

    ok([
      'subjects' => $subjects,
      'sessions' => $sessions,
      'attendance' => $att,
      'habits' => $habits,
      'habit_checkins' => $hcs,
      'exams_count' => $examsCount,
      'notes_count' => $notesCount
    ]);
  }

  case 'getLeaderboard': {
    $stmt = $conn->prepare("SELECT id, full_name, uid, avatar_url FROM users");
    $stmt->execute();
    $res = $stmt->get_result();
    $dbUsers = [];
    while ($row = $res->fetch_assoc()) {
      $dbUsers[] = $row;
    }
    $stmt->close();

    $users = [];
    foreach ($dbUsers as $row) {
      $uId = $row['id'];
      $row['xp'] = calculateUserXP($uId, $conn);
      $users[] = $row;
    }
    
    usort($users, function($a, $b) {
        return $b['xp'] <=> $a['xp'];
    });
    
    ok(['leaderboard' => $users]);
  }

  case 'syncRoutineAttendance': {
    // This logic marks passed routine blocks as 'missed' if they haven't been marked yet.
    // It also handles marking previous days as 'missed' if the user didn't check in.
    $now = new DateTime();
    $today = $now->format('Y-m-d');
    $hhmm = $now->format('H:i:s');
    $dow = (intval($now->format('w')) + 6) % 7; // 0=Mon

    // 1. Get all routine blocks for the user (including templates)
    $stmt = $conn->prepare('SELECT id, subject_id, day_of_week, start_time, end_time FROM routine_blocks WHERE user_id = ?');
    $stmt->bind_param('i', $userId);
    $stmt->execute();
    $blocks = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);

    // 2. Get existing attendance for today
    $stmt = $conn->prepare('SELECT block_id FROM attendance_records WHERE user_id = ? AND date = ? AND block_id IS NOT NULL');
    $stmt->bind_param('is', $userId, $today);
    $stmt->execute();
    $markedToday = array_column($stmt->get_result()->fetch_all(MYSQLI_ASSOC), 'block_id');

    // 3. Mark passed blocks today as missed
    foreach ($blocks as $b) {
        if (($b['day_of_week'] == $dow || $b['day_of_week'] == 0) && !in_array($b['id'], $markedToday)) {
            if ($b['end_time'] < $hhmm) {
                // Mark as missed
                $id = bin2hex(random_bytes(16));
                $st = 'missed';
                $ins = $conn->prepare('INSERT INTO attendance_records (id, user_id, subject_id, block_id, date, status) VALUES (?, ?, ?, ?, ?, ?)');
                $ins->bind_param('sissss', $id, $userId, $b['subject_id'], $b['id'], $today, $st);
                $ins->execute();
            }
        }
    }

    ok(['synced' => true]);
  }

  // =========================
  // Coach Messages
  // =========================
  case 'getCoachMessages': {
    $stmt = $conn->prepare('SELECT id, role, content, created_at FROM coach_messages WHERE user_id = ? ORDER BY created_at ASC');
    $stmt->bind_param('i', $userId);
    $stmt->execute();
    $res = $stmt->get_result();
    $messages = [];
    while ($row = $res->fetch_assoc()) {
        $messages[] = $row;
    }
    ok(['messages' => $messages]);
  }

  case 'deleteCoachMessages': {
    $stmt = $conn->prepare('DELETE FROM coach_messages WHERE user_id = ?');
    $stmt->bind_param('i', $userId);
    $stmt->execute();
    ok((object)[]);
  }

  case 'addCoachMessage': {
    $role = $body['role'] ?? '';
    $content = $body['content'] ?? '';
    if (!$role || !$content) err('Missing role/content');
    
    $id = bin2hex(random_bytes(16));
    
    $stmt = $conn->prepare('INSERT INTO coach_messages (id, user_id, role, content) VALUES (?, ?, ?, ?)');
    $stmt->bind_param('siss', $id, $userId, $role, $content);
    $stmt->execute();
    ok(['id' => $id]);
  }

  default:
    err('Unknown action', 404);
}

