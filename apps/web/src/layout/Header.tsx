interface HeaderProps {
  title: string;
}

export function Header({ title }: HeaderProps) {
  return (
    <header className="screen-head">
      <h1>{title}</h1>
    </header>
  );
}
