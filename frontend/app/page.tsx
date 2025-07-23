import Link from "next/link";
export default function Home() {
  return (
    <>home page 
      <Link href="/candidate/home" className="text-7xl cursor-pointer">Canidate Home </Link>
    </>
  );
}
