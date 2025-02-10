import { useEffect } from "react";
import { useNavigate } from "react-router";
import ConnectionHome from "@/ui/components/ConnectionHome";
import ConnectionList from "@/ui/components/ConnectionList";
import ConnectionModal from "@/ui/components/ConnectionModal";
import SetupGuide from "@/ui/components/SetupGuide";
import UnconnectedHeader from "@/ui/components/UnconnectedHeader";

import { useMenu, useModal } from "@/ui/hooks";
import { useConnections } from "@/ui/hooks/useConnections";
import { useDarkMode } from "@/ui/hooks/useDarkMode";

type SubmitParams = {
  name: string;
  host: string;
  port: number;
  timeout: number;
  username?: string;
  password?: string;
};

export function Connection() {
  const { handleConnect, savedConnections } = useConnections();
  const navigate = useNavigate();

  const { darkMode } = useDarkMode();
  const { openConnectionModal } = useModal();
  const { openMenu } = useMenu();

  useEffect(() => {
    if (savedConnections.length > 0) {
      openMenu();
    }
  }, [savedConnections]);

  async function handleSubmit(params: SubmitParams) {
    const redirect = await handleConnect(params);

    if (!redirect) {
      openConnectionModal();
      return;
    }
    navigate("/panel");
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
