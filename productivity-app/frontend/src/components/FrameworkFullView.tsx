type Props = {
  content: string;
};

export default function FrameworkFullView({ content }: Props) {
  return (
    <div className="mt-3 text-sm text-white leading-relaxed whitespace-pre-wrap break-words">
      {content || "No data"}
    </div>
  );
}
