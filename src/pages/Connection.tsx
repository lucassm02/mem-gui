import { useNavigate } from "react-router";
import ConnectionHome from "@/components/ConnectionHome";
import ConnectionList from "@/components/ConnectionList";
import ConnectionModal from "@/components/ConnectionModal";
import SetupGuide from "@/components/SetupGuide";
import UnconnectedHeader from "@/components/UnconnectedHeader";

import { useConnections } from "@/hooks/useConnections";
import { useDarkMode } from "@/hooks/useDarkMode";

type SubmitParams = { name: string; host: string; port: number };

export function Connection() {
  const { handleConnect } = useConnections();
  const navigate = useNavigate();

  const { darkMode } = useDarkMode();

  async function handleSubmit(params: SubmitParams) {
    const redirect = await handleConnect(params);

    if (redirect) {
      navigate("/panel");
    }
  }

  return (
    <>
      <div
        className={`flex-1 flex flex-col overflow-hidden transition-all ${
          darkMode ? "bg-gray-900 text-gray-100" : "bg-gray-50 text-gray-900"
        }`}
      >
        <UnconnectedHeader />
        <main className="flex-1 overflow-hidden">
          <ConnectionModal onSubmit={handleSubmit} />
          <ConnectionHome />
          <ConnectionList />
          <SetupGuide />
        </main>
      </div>
    </>
  );
}
