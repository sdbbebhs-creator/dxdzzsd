/**
 * Danh sách 20 nhóm chủ đề cố định cho "Luyện Output 5 ngữ cảnh".
 * Dùng chung cho client (fallback offline) và Netlify Function (Gemini chỉ được chọn trong danh sách này).
 */
export interface ContextTopic {
  name: string;
  scope: string;
  /** Từ khóa (Việt/Anh, không dấu) để chọn chủ đề offline khi AI không phản hồi. */
  keywords: string[];
}

export const CONTEXT_TOPICS: ContextTopic[] = [
  { name: 'Bản thân & Tính cách', scope: 'Tên, tuổi, ngoại hình, tính cách, sở thích cá nhân, điểm mạnh/yếu', keywords: ['tinh cach', 'ngoai hinh', 'ban than', 'personality', 'appearance', 'character', 'kind', 'shy', 'tall', 'honest', 'friendly'] },
  { name: 'Gia đình & Quan hệ', scope: 'Thành viên gia đình, bạn bè, người yêu, hàng xóm, mối quan hệ', keywords: ['gia dinh', 'ban be', 'nguoi yeu', 'hang xom', 'quan he', 'family', 'friend', 'relationship', 'parent', 'marry', 'neighbor'] },
  { name: 'Nhà cửa & Nơi ở', scope: 'Các loại nhà, phòng, đồ đạc, khu vực sống, cho thuê/mua nhà', keywords: ['nha', 'phong', 'do dac', 'thue', 'house', 'home', 'room', 'furniture', 'rent', 'apartment', 'kitchen'] },
  { name: 'Thói quen & Cuộc sống hàng ngày', scope: 'Sinh hoạt hàng ngày, giờ giấc, việc nhà, thói quen tốt/xấu', keywords: ['thoi quen', 'hang ngay', 'viec nha', 'sinh hoat', 'habit', 'daily', 'routine', 'usually', 'chore', 'wake'] },
  { name: 'Ăn uống & Ẩm thực', scope: 'Món ăn, đồ uống, nấu ăn, nhà hàng, văn hóa ẩm thực, dị ứng', keywords: ['an', 'uong', 'mon', 'nau', 'thuc an', 'food', 'eat', 'drink', 'cook', 'restaurant', 'meal', 'taste', 'delicious'] },
  { name: 'Mua sắm & Tiêu dùng', scope: 'Mua sắm, giá cả, thương hiệu, đổi trả, ngân hàng, thanh toán', keywords: ['mua', 'gia ca', 'tien', 'thanh toan', 'ngan hang', 'shop', 'buy', 'price', 'pay', 'bank', 'cheap', 'expensive', 'discount'] },
  { name: 'Giao thông & Di chuyển', scope: 'Phương tiện, hỏi đường, đi lại hàng ngày, tắc đường, vé xe', keywords: ['xe', 'duong', 'giao thong', 'di chuyen', 've xe', 'traffic', 'car', 'bus', 'train', 'drive', 'road', 'ticket', 'commute'] },
  { name: 'Du lịch & Khám phá', scope: 'Lên kế hoạch du lịch, khách sạn, địa danh, văn hóa địa phương, trải nghiệm', keywords: ['du lich', 'khach san', 'kham pha', 'travel', 'trip', 'hotel', 'journey', 'explore', 'tour', 'abroad', 'destination'] },
  { name: 'Công việc & Nghề nghiệp', scope: 'Nghề nghiệp, công việc, đồng nghiệp, phỏng vấn, mục tiêu nghề nghiệp', keywords: ['cong viec', 'nghe', 'dong nghiep', 'phong van', 'cong ty', 'job', 'work', 'career', 'office', 'colleague', 'interview', 'boss', 'salary', 'meeting'] },
  { name: 'Học tập & Giáo dục', scope: 'Môn học, trường lớp, phương pháp học, kỳ thi, kỹ năng mới', keywords: ['hoc', 'truong', 'lop', 'thi', 'giao duc', 'study', 'school', 'learn', 'exam', 'student', 'teacher', 'lesson', 'university'] },
  { name: 'Sức khỏe & Cơ thể', scope: 'Bộ phận cơ thể, bệnh tật, đi khám, thuốc, tập thể dục, lối sống lành mạnh', keywords: ['suc khoe', 'benh', 'thuoc', 'co the', 'dau', 'health', 'sick', 'doctor', 'medicine', 'body', 'pain', 'exercise', 'hospital'] },
  { name: 'Sở thích & Giải trí', scope: 'Âm nhạc, phim ảnh, sách, thể thao, trò chơi, sự kiện, lễ hội', keywords: ['so thich', 'giai tri', 'phim', 'nhac', 'the thao', 'hobby', 'music', 'movie', 'film', 'sport', 'game', 'book', 'fun'] },
  { name: 'Công nghệ & Truyền thông', scope: 'Điện thoại, internet, mạng xã hội, ứng dụng, tin tức, làm việc từ xa', keywords: ['cong nghe', 'dien thoai', 'mang', 'ung dung', 'tin tuc', 'technology', 'phone', 'internet', 'app', 'online', 'computer', 'social media', 'news'] },
  { name: 'Thời tiết & Môi trường', scope: 'Thời tiết, mùa, cảnh quan, ô nhiễm, biến đổi khí hậu, bảo vệ thiên nhiên', keywords: ['thoi tiet', 'mua he', 'mua dong', 'moi truong', 'o nhiem', 'thien nhien', 'weather', 'rain', 'season', 'environment', 'pollution', 'climate', 'nature'] },
  { name: 'Cảm xúc & Tâm trạng', scope: 'Vui, buồn, giận, lo lắng, căng thẳng, động viên, chia sẻ cảm xúc', keywords: ['cam xuc', 'tam trang', 'vui', 'buon', 'gian', 'lo lang', 'cang thang', 'feel', 'emotion', 'happy', 'sad', 'angry', 'worried', 'stress', 'upset'] },
  { name: 'Kinh nghiệm & Sự kiện', scope: 'Kể chuyện quá khứ, kỷ niệm, tai nạn, sự kiện quan trọng, so sánh quá khứ-hiện tại', keywords: ['kinh nghiem', 'ky niem', 'qua khu', 'su kien', 'tai nan', 'experience', 'memory', 'past', 'event', 'accident', 'used to', 'happened'] },
  { name: 'Kế hoạch & Mục tiêu', scope: 'Kế hoạch ngắn/dài hạn, ước mơ, dự định, lý do, cách thực hiện', keywords: ['ke hoach', 'muc tieu', 'uoc mo', 'du dinh', 'tuong lai', 'plan', 'goal', 'dream', 'future', 'intend', 'going to'] },
  { name: 'Ý kiến & Tranh luận', scope: 'Đồng ý/không đồng ý, ưu nhược điểm, so sánh, đề xuất, lời khuyên', keywords: ['y kien', 'dong y', 'tranh luan', 'loi khuyen', 'de xuat', 'so sanh', 'opinion', 'agree', 'argue', 'advice', 'suggest', 'should', 'compare'] },
  { name: 'Văn hóa & Xã hội', scope: 'Phong tục, lễ hội, vấn đề xã hội, giáo dục-y tế-thất nghiệp, so sánh văn hóa', keywords: ['van hoa', 'xa hoi', 'phong tuc', 'le hoi', 'culture', 'society', 'custom', 'tradition', 'festival', 'social', 'unemployment'] },
  { name: 'Thời gian & Số đếm', scope: 'Giờ, ngày, tháng, năm, số đếm, tiền tệ, kích thước, màu sắc, đo lường', keywords: ['gio', 'ngay', 'thang', 'so dem', 'mau sac', 'kich thuoc', 'time', 'date', 'number', 'color', 'size', 'measure', 'hour', 'minute'] },
];

export const CONTEXT_TOPIC_NAMES = CONTEXT_TOPICS.map((t) => t.name);

/** Bộ 5 chủ đề mặc định (khi không đoán được gì) — bao quát nhất cho đa số từ. */
export const DEFAULT_TOPIC_NAMES = [
  'Thói quen & Cuộc sống hàng ngày',
  'Công việc & Nghề nghiệp',
  'Học tập & Giáo dục',
  'Cảm xúc & Tâm trạng',
  'Ý kiến & Tranh luận',
];

export function getTopicScope(name: string): string | undefined {
  return CONTEXT_TOPICS.find((t) => t.name === name)?.scope;
}

function normalize(text: string) {
  return ` ${text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()} `;
}

/** Chọn 5 chủ đề phù hợp nhất bằng so khớp từ khóa (fallback offline). */
export function pickTopicsOffline(word: string, definition: string): string[] {
  const haystack = normalize(`${word} ${definition}`);
  const scored = CONTEXT_TOPICS.map((topic, index) => ({
    name: topic.name,
    index,
    score: topic.keywords.reduce((sum, kw) => sum + (haystack.includes(` ${kw} `) ? 1 : 0), 0),
  }))
    .filter((t) => t.score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map((t) => t.name);
  const picked = scored.slice(0, 5);
  for (const name of DEFAULT_TOPIC_NAMES) {
    if (picked.length >= 5) break;
    if (!picked.includes(name)) picked.push(name);
  }
  return picked;
}
