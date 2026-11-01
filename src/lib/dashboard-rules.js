/**
 * Dashboard Decision Rules and Thresholds
 * 
 * Defines the health and risk criteria used to evaluate platform metrics
 * and generate rule-based summary sentences for the Admin Analytics Dashboard.
 * 
 * Status Categories:
 * - "good": Metric meets or exceeds healthy operating thresholds.
 * - "watch": Metric shows minor degradation or plateau requiring attention.
 * - "action": Metric violates target SLA or exceeds risk thresholds.
 */

export const DASHBOARD_THRESHOLDS = {
  // 1. User & Community Growth
  GROWTH: {
    HEALTHY_USER_GROWTH_PCT: 5.0, // >= +5% vs previous period is Good
    WATCH_USER_GROWTH_PCT: -5.0,  // between -5% and +5% is Watch; < -5% is Action
    HEALTHY_RETURNING_PCT: 40.0,  // >= 40% of active users are returning is Good
  },

  // 2. Safety & Moderation Workload
  SAFETY: {
    MAX_UNRESOLVED_REPORTS_GOOD: 5,   // <= 5 pending/escalated is Good
    MAX_UNRESOLVED_REPORTS_WATCH: 15,  // 6 - 15 is Watch; > 15 is Action needed
    MAX_ESCALATED_REPORTS_GOOD: 0,    // 0 escalated is Good; 1-2 is Watch; > 2 is Action
    MAX_ESCALATED_REPORTS_WATCH: 2,
    MAX_OLDEST_REPORT_HOURS_GOOD: 24, // Oldest unresolved < 24h is Good
    MAX_OLDEST_REPORT_HOURS_WATCH: 72,// 24h - 72h is Watch; > 72h (3 days) is Action
    MIN_RESOLUTION_RATE_GOOD: 80.0,   // >= 80% resolution rate is Good
    MIN_RESOLUTION_RATE_WATCH: 50.0,  // 50% - 80% is Watch; < 50% is Action
  },

  // 3. Platform Resonance & Engagement
  ENGAGEMENT: {
    MIN_ENG_PER_POST_GOOD: 2.0,      // >= 2.0 interactions per post is Good
    MIN_ENG_PER_POST_WATCH: 0.8,     // 0.8 - 2.0 is Watch; < 0.8 is Action
    HEALTHY_STICKINESS_GOOD: 20.0,   // DAU / MAU >= 20% is Good
    HEALTHY_STICKINESS_WATCH: 10.0,  // 10% - 20% is Watch; < 10% is Action
  },

  // 4. Advertising Readiness & Brand Safety
  BRAND_SAFETY: {
    MIN_SAFETY_SCORE_GOOD: 98.0,     // Brand safety >= 98% is Good for advertisers
    MIN_SAFETY_SCORE_WATCH: 92.0,    // 92% - 98% is Watch; < 92% is Action
    MAX_FLAGGED_RATE_GOOD: 1.0,      // Flagged content rate <= 1.0% is Good
    MAX_FLAGGED_RATE_WATCH: 3.0,     // 1.0% - 3.0% is Watch; > 3.0% is Action
  },
};

/**
 * Evaluates KPIs against documented rules and produces 3-4 structured summary sentences.
 * 
 * @param {Object} kpis - KPI metrics object
 * @param {string} locale - "en" or "th"
 * @returns {Array<{ id: string, status: "good"|"watch"|"action", text: string }>}
 */
export function generatePlatformSummary(kpis = {}, locale = "en") {
  const isTh = locale === "th";
  const sentences = [];

  // ---------------------------------------------------------------------------
  // Sentence 1: Community Growth & Active Audience
  // ---------------------------------------------------------------------------
  const newUsers = kpis.new_users || 0;
  const prevNewUsers = kpis.prev_new_users || 0;
  const activeUsers = kpis.active_users || 0;
  let userDeltaPct = 0;
  if (prevNewUsers > 0) {
    userDeltaPct = Math.round(((newUsers - prevNewUsers) / prevNewUsers) * 100);
  } else if (newUsers > 0) {
    userDeltaPct = 100;
  }

  if (userDeltaPct >= DASHBOARD_THRESHOLDS.GROWTH.HEALTHY_USER_GROWTH_PCT) {
    sentences.push({
      id: "growth",
      status: "good",
      text: isTh
        ? `การเติบโตของผู้ใช้ใหม่เพิ่มขึ้น ${userDeltaPct}% โดยมีผู้ใช้งานที่แอคทีฟ ${activeUsers.toLocaleString()} คนในทุกบทบาท`
        : `New user signups grew by ${userDeltaPct}% with ${activeUsers.toLocaleString()} active users across all roles.`,
    });
  } else if (userDeltaPct >= DASHBOARD_THRESHOLDS.GROWTH.WATCH_USER_GROWTH_PCT) {
    sentences.push({
      id: "growth",
      status: "watch",
      text: isTh
        ? `การเติบโตของผู้ใช้ใหม่ทรงตัว (${userDeltaPct >= 0 ? "+" : ""}${userDeltaPct}%) โดยมีผู้ใช้งานแอคทีฟ ${activeUsers.toLocaleString()} คน`
        : `User growth held steady (${userDeltaPct >= 0 ? "+" : ""}${userDeltaPct}%) with ${activeUsers.toLocaleString()} active participants.`,
    });
  } else {
    sentences.push({
      id: "growth",
      status: "action",
      text: isTh
        ? `การลงทะเบียนผู้ใช้ใหม่ชะลอตัวลง (${userDeltaPct}%) ควรพิจารณาแคมเปญกระตุ้นการมีส่วนร่วมและการรับรู้`
        : `New user registrations contracted by ${Math.abs(userDeltaPct)}%, indicating a need for acquisition campaigns.`,
    });
  }

  // ---------------------------------------------------------------------------
  // Sentence 2: Moderation Backlog & SLA Compliance
  // ---------------------------------------------------------------------------
  const pendingReports = kpis.pending_escalated_reports || 0;
  const oldestSeconds = kpis.oldest_unresolved_seconds || 0;
  const oldestHours = Math.round((oldestSeconds / 3600) * 10) / 10;
  const oldestDays = Math.round((oldestSeconds / 86400) * 10) / 10;
  const resolutionRate = kpis.resolution_rate || 0;

  if (pendingReports === 0) {
    sentences.push({
      id: "safety",
      status: "good",
      text: isTh
        ? `คิวการตรวจสอบเนื้อหาว่าง ไม่มีรายงานที่ค้างอยู่ และอัตราการแก้ไขอยู่ที่ ${resolutionRate}%`
        : `Moderation queue is fully clear with 0 pending reports and a ${resolutionRate}% resolution rate.`,
    });
  } else if (
    pendingReports <= DASHBOARD_THRESHOLDS.SAFETY.MAX_UNRESOLVED_REPORTS_GOOD &&
    oldestHours <= DASHBOARD_THRESHOLDS.SAFETY.MAX_OLDEST_REPORT_HOURS_GOOD
  ) {
    sentences.push({
      id: "safety",
      status: "good",
      text: isTh
        ? `การตรวจสอบรายงานเป็นไปตามเกณฑ์ มีรายงานค้าง ${pendingReports} รายการ (รายงานที่เก่าที่สุดรอมา ${oldestHours} ชม.)`
        : `Moderation queue is healthy with ${pendingReports} open reports (oldest unresolved: ${oldestHours} hrs).`,
    });
  } else if (
    pendingReports <= DASHBOARD_THRESHOLDS.SAFETY.MAX_UNRESOLVED_REPORTS_WATCH &&
    oldestHours <= DASHBOARD_THRESHOLDS.SAFETY.MAX_OLDEST_REPORT_HOURS_WATCH
  ) {
    sentences.push({
      id: "safety",
      status: "watch",
      text: isTh
        ? `มีรายงานค้างอยู่ ${pendingReports} รายการ โดยรายงานที่เก่าที่สุดรอมาแล้ว ${oldestDays > 1 ? `${oldestDays} วัน` : `${oldestHours} ชม.`} ควรเร่งตรวจสอบ`
        : `Moderation backlog has ${pendingReports} open reports with the oldest waiting ${oldestDays > 1 ? `${oldestDays} days` : `${oldestHours} hrs`}.`,
    });
  } else {
    sentences.push({
      id: "safety",
      status: "action",
      text: isTh
        ? `พบรายงานสะสม ${pendingReports} รายการ (รายงานเก่าสุดค้าง ${oldestDays} วัน) จำเป็นต้องเพิ่มกำลังผู้กลั่นกรอง`
        : `Action needed on moderation backlog: ${pendingReports} unresolved reports with oldest open for ${oldestDays} days.`,
    });
  }

  // ---------------------------------------------------------------------------
  // Sentence 3: Engagement Quality & Content Resonance
  // ---------------------------------------------------------------------------
  const engPerPost = kpis.engagement_per_post || 0;
  const totalPosts = kpis.new_posts || 0;
  const totalEngagement = kpis.total_engagement || 0;

  if (engPerPost >= DASHBOARD_THRESHOLDS.ENGAGEMENT.MIN_ENG_PER_POST_GOOD) {
    sentences.push({
      id: "engagement",
      status: "good",
      text: isTh
        ? `การมีส่วนร่วมของเนื้อหาแข็งแกร่ง เฉลี่ย ${engPerPost} ปฏิสัมพันธ์ต่อโพสต์ จากทั้งหมด ${totalEngagement.toLocaleString()} ปฏิสัมพันธ์`
        : `Content engagement is strong at ${engPerPost} interactions per post across ${totalEngagement.toLocaleString()} total actions.`,
    });
  } else if (engPerPost >= DASHBOARD_THRESHOLDS.ENGAGEMENT.MIN_ENG_PER_POST_WATCH) {
    sentences.push({
      id: "engagement",
      status: "watch",
      text: isTh
        ? `การมีส่วนร่วมต่อโพสต์เฉลี่ย ${engPerPost} ปฏิสัมพันธ์ จาก ${totalPosts.toLocaleString()} โพสต์ใหม่ อยู่ในเกณฑ์ปานกลาง`
        : `Engagement per post averages ${engPerPost} interactions across ${totalPosts.toLocaleString()} published posts.`,
    });
  } else {
    sentences.push({
      id: "engagement",
      status: "action",
      text: isTh
        ? `อัตราการมีส่วนร่วมต่อโพสต์ต่ำ (${engPerPost}) ควรสนับสนุนให้ผู้ใช้สร้างบทสนทนาและหัวข้อข่าวที่น่าสนใจ`
        : `Low engagement density of ${engPerPost} per post signals a need for community discussion prompts.`,
    });
  }

  // ---------------------------------------------------------------------------
  // Sentence 4: Brand Safety & Advertising Readiness
  // ---------------------------------------------------------------------------
  const brandSafety = kpis.brand_safety_score ?? 100;
  const flaggedRate = kpis.flagged_content_rate || 0;

  if (brandSafety >= DASHBOARD_THRESHOLDS.BRAND_SAFETY.MIN_SAFETY_SCORE_GOOD) {
    sentences.push({
      id: "advertising",
      status: "good",
      text: isTh
        ? `คะแนนความปลอดภัยของแบรนด์สูงที่ ${brandSafety}% (เนื้อหาที่ถูกตั้งสถานะเพียง ${flaggedRate}%) พร้อมสำหรับผู้ลงโฆษณา`
        : `Brand safety score is optimal at ${brandSafety}% (${flaggedRate}% flagged rate), fully ready for enterprise advertisers.`,
    });
  } else if (brandSafety >= DASHBOARD_THRESHOLDS.BRAND_SAFETY.MIN_SAFETY_SCORE_WATCH) {
    sentences.push({
      id: "advertising",
      status: "watch",
      text: isTh
        ? `คะแนนความปลอดภัยของแบรนด์อยู่ที่ ${brandSafety}% มีเนื้อหาที่ถูกตั้งสถานะ ${flaggedRate}% ควรเฝ้าระวังก่อนเริ่มแคมเปญโฆษณา`
        : `Brand safety score is ${brandSafety}% with ${flaggedRate}% flagged content; monitor automated filters before ad flights.`,
    });
  } else {
    sentences.push({
      id: "advertising",
      status: "action",
      text: isTh
        ? `ความปลอดภัยของแบรนด์ต่ำกว่าเกณฑ์ (${brandSafety}%) ต้องปรับปรุงตัวกรองคำหยาบและมาตรการก่อนรับผู้ลงโฆษณา`
        : `Brand safety score fell to ${brandSafety}%; filter tuning and stricter moderation required prior to courting advertisers.`,
    });
  }

  return sentences;
}
