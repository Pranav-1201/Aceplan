import { act, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

// A stand-in for supabase.auth: getSession is controlled per test, and the auth-change callback
// is captured so a test can simulate signing out later.
const h = vi.hoisted(() => ({
  getSession: vi.fn(),
  unsubscribe: vi.fn(),
  emit: null as null | ((event: string, session: unknown) => void),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getSession: h.getSession,
      onAuthStateChange: (callback: (event: string, session: unknown) => void) => {
        h.emit = callback;
        return { data: { subscription: { unsubscribe: h.unsubscribe } } };
      },
    },
  },
}));

import ProtectedRoute from "@/components/ProtectedRoute";

function renderApp() {
  return render(
    <MemoryRouter initialEntries={["/secret"]}>
      <Routes>
        <Route path="/auth" element={<div>sign in page</div>} />
        <Route element={<ProtectedRoute />}>
          <Route path="/secret" element={<div>secret page</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  h.emit = null;
});

describe("ProtectedRoute", () => {
  it("shows the page when a session exists", async () => {
    h.getSession.mockResolvedValue({ data: { session: { access_token: "t" } } });

    renderApp();

    expect(await screen.findByText("secret page")).toBeInTheDocument();
  });

  it("sends a signed-out visitor to the sign-in page", async () => {
    h.getSession.mockResolvedValue({ data: { session: null } });

    renderApp();

    expect(await screen.findByText("sign in page")).toBeInTheDocument();
    expect(screen.queryByText("secret page")).not.toBeInTheDocument();
  });

  it("shows a loading message and neither page while the session is unknown", () => {
    h.getSession.mockReturnValue(new Promise(() => {}));

    renderApp();

    expect(screen.getByRole("status")).toHaveTextContent("Loading...");
    expect(screen.queryByText("secret page")).not.toBeInTheDocument();
    expect(screen.queryByText("sign in page")).not.toBeInTheDocument();
  });

  it("returns to the sign-in page when the user signs out later", async () => {
    h.getSession.mockResolvedValue({ data: { session: { access_token: "t" } } });
    renderApp();
    await screen.findByText("secret page");

    act(() => {
      h.emit?.("SIGNED_OUT", null);
    });

    expect(await screen.findByText("sign in page")).toBeInTheDocument();
  });

  it("stops listening when it unmounts", async () => {
    h.getSession.mockResolvedValue({ data: { session: { access_token: "t" } } });
    const { unmount } = renderApp();
    await screen.findByText("secret page");

    unmount();

    expect(h.unsubscribe).toHaveBeenCalledTimes(1);
  });
});
