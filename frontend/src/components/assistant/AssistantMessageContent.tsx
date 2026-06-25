import type { ReactNode } from 'react';

function renderInline(text: string): ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={i} className="font-semibold text-slate-900">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return part;
  });
}

export function AssistantMessageContent({
  content,
  streaming = false,
}: {
  content: string;
  streaming?: boolean;
}) {
  const lines = content.split('\n');
  const blocks: ReactNode[] = [];
  let listItems: ReactNode[] = [];

  function flushList() {
    if (listItems.length === 0) return;
    blocks.push(
      <ul key={`list-${blocks.length}`} className="my-1.5 space-y-1 pl-1">
        {listItems}
      </ul>,
    );
    listItems = [];
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      flushList();
      continue;
    }

    const bulletMatch = trimmed.match(/^[-•]\s+(.*)$/);
    if (bulletMatch) {
      listItems.push(
        <li key={`li-${i}`} className="flex gap-2 text-slate-700">
          <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-[#103B73]" aria-hidden />
          <span>{renderInline(bulletMatch[1])}</span>
        </li>,
      );
      continue;
    }

    flushList();

    if (trimmed.startsWith('**') && trimmed.endsWith('**')) {
      blocks.push(
        <p key={`heading-${i}`} className="mt-2.5 first:mt-0 text-sm font-semibold text-slate-900">
          {renderInline(trimmed)}
        </p>,
      );
    } else {
      blocks.push(
        <p key={`p-${i}`} className="text-slate-700 leading-relaxed">
          {renderInline(trimmed)}
        </p>,
      );
    }
  }

  flushList();

  return (
    <div className="text-sm">
      {blocks.length > 0 ? blocks : <p className="text-slate-700">{content}</p>}
      {streaming ? (
        <span
          className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-[#103B73]"
          aria-hidden
        />
      ) : null}
    </div>
  );
}
