'use client';

import { useState, useRef } from 'react';
import { WikiTextRenderer } from './WikiLink';

type MarkdownEditorProps = {
  label: string;
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  required?: boolean;
  rows?: number;
  maxLength?: number;
};

const WIKI_TEMPLATE = `## 📌 개요
이 제품은 [[20대 자취·독립 갤러리]]에서 가장 지지받는 1위 아이템입니다.

## 💡 주요 특징 & 장점
- **휴대성 & 조작감**: 가볍고 소음이 적어 사용하기 편리합니다.
- **가성비**: 동급 대비 월등한 스펙을 자랑합니다.

## ⚙️ 주요 스펙
| 항목 | 사양 |
|---|---|
| 전원 | 220V 무선 |
| 무게 | 1.2kg |

## 🔗 연관 테마
- [[30대 이직·육아·독립 갤러리]]
- [[데스크테리어 갤러리]]
`;

export function MarkdownEditor({
  label,
  value,
  onChange,
  placeholder = '마크다운 서식을 지원합니다. [[연관테마명]]을 써서 교차 링크를 생성해보세요.',
  required = false,
  rows = 8,
  maxLength = 20000,
}: MarkdownEditorProps) {
  const [activeTab, setActiveTab] = useState<'WRITE' | 'PREVIEW'>('WRITE');
  const [showWikiModal, setShowWikiModal] = useState(false);
  const [wikiSearchInput, setWikiSearchInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 커서 위치에 마크다운 텍스트 삽입
  const insertText = (before: string, after: string = '', defaultText: string = '') => {
    const textarea = textareaRef.current;
    if (!textarea) {
      onChange(value + before + defaultText + after);
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = value.substring(start, end) || defaultText;
    const replacement = before + selected + after;

    const newValue = value.substring(0, start) + replacement + value.substring(end);
    onChange(newValue);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + before.length, start + before.length + selected.length);
    }, 10);
  };

  return (
    <div className="space-y-2 select-none">
      {/* 라벨 & 탭 스위처 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <label className="text-sm font-bold text-slate-200 flex items-center gap-1.5">
          <span>{label}</span>
          {required && <span className="text-accent">*</span>}
        </label>

        {/* 탭 토글 & 템플릿 버튼 */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onChange(value ? value + '\n\n' + WIKI_TEMPLATE : WIKI_TEMPLATE)}
            className="chip bg-indigo-500/20 text-indigo-300 border-indigo-400/30 hover:bg-indigo-500/30 transition-all text-[11px] cursor-pointer"
          >
            📋 위키 템플릿 삽입
          </button>

          <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/10">
            <button
              type="button"
              onClick={() => setActiveTab('WRITE')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                activeTab === 'WRITE' ? 'bg-accent text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              ✍️ 작성
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('PREVIEW')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                activeTab === 'PREVIEW' ? 'bg-accent text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              👁️ 실시간 미리보기
            </button>
          </div>
        </div>
      </div>

      {/* 툴바 툴킷 (Write 모드일 때만 표시) */}
      {activeTab === 'WRITE' && (
        <div className="flex flex-wrap items-center gap-1 p-2 rounded-xl bg-white/[0.04] border border-white/10 text-xs">
          <button
            type="button"
            title="굵게"
            onClick={() => insertText('**', '**', '굵은 텍스트')}
            className="px-2.5 py-1 rounded bg-white/5 hover:bg-white/15 text-slate-200 font-bold"
          >
            B
          </button>
          <button
            type="button"
            title="기울임"
            onClick={() => insertText('*', '*', '기울임 텍스트')}
            className="px-2.5 py-1 rounded bg-white/5 hover:bg-white/15 text-slate-200 italic font-serif"
          >
            I
          </button>
          <button
            type="button"
            title="제목"
            onClick={() => insertText('### ', '', '소제목')}
            className="px-2.5 py-1 rounded bg-white/5 hover:bg-white/15 text-slate-200 font-black"
          >
            H3
          </button>
          <span className="w-px h-4 bg-white/10 mx-1" />

          {/* 위키피디아 [[교차링크]] 삽입 버튼 */}
          <button
            type="button"
            title="위키 교차 링크"
            onClick={() => setShowWikiModal(true)}
            className="px-2.5 py-1 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold hover:bg-emerald-500/30 flex items-center gap-1"
          >
            📚 [[교차링크]]
          </button>

          <button
            type="button"
            title="목록"
            onClick={() => insertText('- ', '', '목록 항목')}
            className="px-2.5 py-1 rounded bg-white/5 hover:bg-white/15 text-slate-200"
          >
            • 목록
          </button>
          <button
            type="button"
            title="표(Table)"
            onClick={() => insertText('\n| 항목 | 스펙 |\n|---|---|\n| 사양 | ', ' |\n', '내용')}
            className="px-2.5 py-1 rounded bg-white/5 hover:bg-white/15 text-slate-200"
          >
            📊 표
          </button>
          <button
            type="button"
            title="인용구"
            onClick={() => insertText('> ', '', '인용 내용')}
            className="px-2.5 py-1 rounded bg-white/5 hover:bg-white/15 text-slate-200"
          >
            “ 인용
          </button>
        </div>
      )}

      {/* 작성 뷰 vs 실시간 미리보기 뷰 */}
      {activeTab === 'WRITE' ? (
        <div className="relative">
          <textarea
            ref={textareaRef}
            rows={rows}
            maxLength={maxLength}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="field min-h-48 font-mono text-sm leading-relaxed"
          />
          <div className="mt-1 flex justify-end text-[11px] text-slate-400">
            <span>{value.length.toLocaleString()} / {maxLength.toLocaleString()}자</span>
          </div>
        </div>
      ) : (
        <div className="card bg-[#070b14]/90 border-accent/40 p-5 min-h-48 space-y-2 overflow-y-auto">
          <div className="flex items-center justify-between border-b border-white/10 pb-2 text-xs text-accent font-bold">
            <span>👁️ 실시간 위키피디아 렌더링 미리보기</span>
            <span className="text-[10px] text-slate-400">[[교차링크]] 마우스 호버 시 팝업 카드 동작</span>
          </div>
          <div className="prose-wiki text-sm leading-relaxed text-slate-200">
            {value ? (
              <WikiTextRenderer text={value} />
            ) : (
              <p className="text-slate-500 italic">내용을 작성하시면 여기에 실시간 렌더링이 표시됩니다.</p>
            )}
          </div>
        </div>
      )}

      {/* [[WikiLink]] 도우미 모달 */}
      {showWikiModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="card w-full max-w-md bg-slate-900 border-white/20 p-6 space-y-4 shadow-2xl">
            <h4 className="text-base font-black text-white flex items-center gap-2">
              <span>📚 교차 링크([[WikiLink]]) 도우미</span>
            </h4>
            <p className="text-xs text-slate-300">
              연결하고 싶은 서브 갤러리나 제품명을 입력하세요.
            </p>
            <input
              type="text"
              placeholder="예: 20대 자취·독립 갤러리, 1구 인덕션..."
              value={wikiSearchInput}
              onChange={(e) => setWikiSearchInput(e.target.value)}
              className="field"
              autoFocus
            />
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowWikiModal(false)}
                className="btn-ghost text-xs"
              >
                취소
              </button>
              <button
                type="button"
                onClick={() => {
                  if (wikiSearchInput.trim()) {
                    insertText(`[[${wikiSearchInput.trim()}]]`, '');
                  }
                  setWikiSearchInput('');
                  setShowWikiModal(false);
                }}
                className="btn-primary text-xs"
              >
                삽입하기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
