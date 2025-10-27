// src/App.tsx
import { BrowserRouter, Routes, Route } from "react-router-dom";
import SelectPair from "./pages/SelectPair";
import ForecastResult from "./pages/ForecastResult";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/select" element={<SelectPair />} />
        <Route path="/forecast" element={<ForecastResult />} />
      </Routes>
    </BrowserRouter>
  );
}
