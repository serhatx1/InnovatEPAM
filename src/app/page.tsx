import Link from "next/link";

export default function HomePage() {
  return (
    <main style={{ padding: 24 }}>
      <h1>InnovatEPAM Portal</h1>
      <p>MVP workspace is ready.</p>
      <ul>
        <li>
          <Link href="/auth/login">Login</Link>
        </li>
        <li>
          <Link href="/auth/register">Register</Link>
        </li>
        <li>
          <Link href="/ideas/new">Submit Idea</Link>
        </li>
        <li>
          <Link href="/auth/logout">Logout</Link>
        </li>
      </ul>
    </main>
  );
}
