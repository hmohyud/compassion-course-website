import React from 'react';
import { useParams, Navigate } from 'react-router-dom';

const DEFAULT_COMPANY_ID = 'default';

/**
 * Redirects to the shared platform whiteboard editor with team context
 * so Back returns to the team whiteboards list.
 */
const TeamWhiteboardPage: React.FC = () => {
  const { teamId, whiteboardId } = useParams<{ teamId: string; whiteboardId: string }>();
  if (!whiteboardId || !teamId) {
    return <Navigate to="/portal/leadership/teams" replace />;
  }
  return (
    <Navigate
      to={`/platform/whiteboards/${whiteboardId}?teamId=${teamId}&companyId=${DEFAULT_COMPANY_ID}`}
      replace
    />
  );
};

export default TeamWhiteboardPage;
