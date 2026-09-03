interface HeaderProps {
  title: string;
  subtitle?: string;
}

export function Header({ title, subtitle }: HeaderProps) {
  return (
    <header className="screen-head">
      <h1>{title}</h1>
      {subtitle && <p className="sub">{subtitle}</p>}
    </header>
  );
}
