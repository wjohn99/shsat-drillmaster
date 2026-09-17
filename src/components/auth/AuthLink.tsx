import { Link, type LinkProps } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useExamLock } from "@/contexts/ExamLockContext";

type AuthLinkProps = LinkProps & {
  to: string;
};

/**
 * Routes authenticated users to `to`; sends guests to `/login` with a return path.
 * During a locked diagnostic, clicks open the same leave-exam warning instead of navigating.
 */
export function AuthLink({ to, state, onClick, ...props }: AuthLinkProps) {
  const { profile } = useAuth();
  const { locked, requestLeave } = useExamLock();

  if (locked) {
    return (
      <a
        href={to}
        {...props}
        onClick={(event) => {
          event.preventDefault();
          onClick?.(event);
          requestLeave();
        }}
      />
    );
  }

  if (profile) {
    return <Link to={to} state={state} onClick={onClick} {...props} />;
  }

  return <Link to="/login" state={{ from: { pathname: to } }} onClick={onClick} {...props} />;
}
