export default function EditorLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-screen overflow-hidden bg-background text-foreground">{children}</div>
  );
}
