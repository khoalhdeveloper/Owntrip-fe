import assert from 'node:assert/strict';
import test from 'node:test';

const { formatChatbotMessageText } = await import('../src/utils/chatbotText.ts');

test('removes raw bold markdown markers from chatbot replies', () => {
  assert.equal(
    formatChatbotMessageText('Bạn chọn **Đà Nẵng - Hội An**.\n\n* **Lịch trình:**'),
    'Bạn chọn Đà Nẵng - Hội An.\n\n* Lịch trình:',
  );
});

test('keeps normal multiplication and plain asterisks untouched', () => {
  assert.equal(formatChatbotMessageText('2 * 3 = 6\n* mục gợi ý'), '2 * 3 = 6\n* mục gợi ý');
});
