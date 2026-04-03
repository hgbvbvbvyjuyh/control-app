type Props = {
  content: string;
  onClick?: () => void;
};

export default function FrameworkPreview({ content, onClick }: Props) {
  return (
    <div
      onClick={onClick}
      className="cursor-pointer text-sm text-white/70 leading-relaxed break-words line-clamp-2 hover:text-white transition"
    >
      {content || "No data"}
    </div>
  );
}
