import { useNavigate } from "react-router";
import ConnectionForm from "@/components/ConnectionForm";
import ConnectionList from "@/components/ConnectionList";
import UnconnectedHeader from "@/components/UnconnectedHeader";

import { useConnections } from "@/hooks/useConnections";
import { useDarkMode } from "@/hooks/useDarkMode";

type SubmitParams = { name: string; host: string; port: number };

export function Connection() {
  const { handleConnect } = useConnections();
  const navigate = useNavigate();

  const { darkMode } = useDarkMode();

  async function submit(params: SubmitParams) {
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
        <main className="flex-1 overflow-auto">
          <ConnectionForm onSubmit={submit} />
          <ConnectionList />
        </main>
      </div>
    </>
  );
}
