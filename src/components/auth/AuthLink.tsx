import { Link, type LinkProps } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

type AuthLinkProps = LinkProps & {
  to: string;
};

/**
 * Routes authenticated users to `to`; sends guests to `/login` with a return path.
 */
export function AuthLink({ to, state, ...props }: AuthLinkProps) {
  const { profile } = useAuth();

  if (profile) {
    return <Link to={to} state={state} {...props} />;
  }

  return <Link to="/login" state={{ from: { pathname: to } }} {...props} />;
}
