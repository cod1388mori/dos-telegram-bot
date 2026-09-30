import { Outlet } from "react-router-dom";
import Navbar from "./Navbar";

export default function AppLayout() {
  return (
    <div className="min-h-screen bg-ink">
      <Navbar />
      <main className="mx-auto w-full max-w-5xl px-4 pb-24 pt-20">
        <Outlet />
      </main>
    </div>
  );
}
