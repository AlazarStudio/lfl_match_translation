import React from "react";
import { Route, Routes } from "react-router-dom";

import Main_Page from "./Components/Pages/Main_Page";
import Non_Found_Page from "./Components/Pages/Non_Found_Page";
import Layout from "./Components/Standart/Layout/Layout";
import InstallButton from "./Components/Pages/InstallButton/InstallButton";
import DevLiveProbe from "./DevLiveProbe";
import DevClockProbe from "./DevClockProbe";
import OverlayPanel from "./Components/Pages/OverlayPanel";
import LineupTest from "./Components/Pages/LineupTest";

function App() {
  const MATCH_ID = 14;

  return (
    <>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Main_Page MATCH_ID={MATCH_ID} />} />
          <Route path="/overlay" element={<OverlayPanel MATCH_ID={MATCH_ID} />} />
          <Route path="/LineupTest" element={<LineupTest MATCH_ID={MATCH_ID} />} />

          <Route path="/probe" element={<DevLiveProbe />} />
          <Route path="/clock" element={<DevClockProbe />} />
          <Route path="*" element={<Non_Found_Page />} />
        </Route>
      </Routes>

      {/* Кнопка установки */}
      {/* <InstallButton /> */}
    </>
  )
}

export default App
