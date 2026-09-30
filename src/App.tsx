import { Routes, Route } from "react-router-dom";
import Landing from "./pages/Landing";
import AuthPage from "./pages/AuthPage";
import Feed from "./pages/Feed";
import Explore from "./pages/Explore";
import Search from "./pages/Search";
import NotificationsPage from "./pages/NotificationsPage";
import CreatePost from "./pages/CreatePost";
import Profile from "./pages/Profile";
import RequireAuth from "./components/RequireAuth";
import AppLayout from "./components/AppLayout";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/auth" element={<AuthPage />} />
      <Route element={<RequireAuth />}>
        <Route element={<AppLayout />}>
          <Route path="/feed" element={<Feed />} />
          <Route path="/explore" element={<Explore />} />
          <Route path="/search" element={<Search />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/create" element={<CreatePost />} />
          <Route path="/u/:username" element={<Profile />} />
        </Route>
      </Route>
      <Route path="*" element={<Landing />} />
    </Routes>
  );
}
