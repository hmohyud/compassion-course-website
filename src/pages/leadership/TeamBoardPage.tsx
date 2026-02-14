import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { FaUser, FaCog } from 'react-icons/fa';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
} from '@dnd-kit/core';
import Layout from '../../components/Layout';
import { listWorkItems, updateWorkItem, createWorkItem } from '../../services/leadershipWorkItemsService';
import { getTeam } from '../../services/leadershipTeamsService';
import { getUserProfile } from '../../services/userProfileService';
import type { LeadershipWorkItem, WorkItemStatus } from '../../types/leadership';

const COLUMNS: { id: WorkItemStatus; label: string; barColor: string }[] = [
  { id: 'backlog', label: 'Backlog', barColor: '#8b5cf6' },
  { id: 'todo', label: 'Planned work', barColor: '#f59e0b' },
  { id: 'in_progress', label: 'In Progress', barColor: '#22c55e' },
  { id: 'done', label: 'Done', barColor: '#4b5563' },
];

function CardContent({
  item,
  assigneeName,
}: {
  item: LeadershipWorkItem;
  assigneeName: string | null;
}) {
  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
        <span style={{ fontSize: '0.7rem', color: '#22c55e', fontWeight: 600, textTransform: 'uppercase' }}>TASK</span>
      </div>
      <div style={{ fontWeight: 600, marginBottom: '6px', fontSize: '0.95rem' }}>{item.title}</div>
      {item.blocked && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%) rotate(-12deg)',
            fontWeight: 700,
            fontSize: '1.1rem',
            color: '#dc2626',
            pointerEvents: 'none',
            textShadow: '0 0 2px #fff',
          }}
        >
          BLOCKED
        </div>
      )}
      {assigneeName && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: '#6b7280', marginTop: '8px' }}>
          <FaUser style={{ flexShrink: 0, fontSize: '0.75rem' }} />
          <span>{assigneeName}</span>
        </div>
      )}
    </>
  );
}

function WorkItemCard({
  item,
  assigneeName,
  isDragging,
}: {
  item: LeadershipWorkItem;
  assigneeName: string | null;
  isDragging?: boolean;
}) {
  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid #bbf7d0',
        borderRadius: '8px',
        padding: '12px',
        marginBottom: '8px',
        fontSize: '0.9rem',
        color: '#111827',
        position: 'relative' as const,
        opacity: isDragging ? 0.6 : 1,
        cursor: 'grab',
        boxShadow: isDragging ? '0 4px 12px rgba(0,0,0,0.15)' : '0 1px 3px rgba(0,0,0,0.08)',
      }}
    >
      <CardContent item={item} assigneeName={assigneeName} />
    </div>
  );
}

const TeamBoardPage: React.FC = () => {
  const { teamId } = useParams<{ teamId: string }>();
  const [workItems, setWorkItems] = useState<LeadershipWorkItem[]>([]);
  const [teamName, setTeamName] = useState('');
  const [memberIds, setMemberIds] = useState<string[]>([]);
  const [memberLabels, setMemberLabels] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [showAddItem, setShowAddItem] = useState(false);
  const [addItemTitle, setAddItemTitle] = useState('');
  const [addItemAssigneeId, setAddItemAssigneeId] = useState('');
  const [addingItem, setAddingItem] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const loadBoard = () => {
    if (!teamId) return;
    setLoading(true);
    Promise.all([listWorkItems(teamId), getTeam(teamId)])
      .then(([items, team]) => {
        setWorkItems(items);
        setTeamName(team?.name ?? '');
        setMemberIds(team?.memberIds ?? []);
        if (team?.memberIds?.length) {
          Promise.all(
            team.memberIds.map((uid) =>
              getUserProfile(uid).then((p) => [uid, p?.name || p?.email || uid] as const)
            )
          ).then((pairs) => setMemberLabels(Object.fromEntries(pairs)));
        } else {
          setMemberLabels({});
        }
      })
      .catch(() => {
        setWorkItems([]);
        setTeamName('');
        setMemberIds([]);
        setMemberLabels({});
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadBoard();
  }, [teamId]);

  const moveItem = async (itemId: string, newStatus: WorkItemStatus) => {
    try {
      await updateWorkItem(itemId, { status: newStatus });
      setWorkItems((prev) =>
        prev.map((w) => (w.id === itemId ? { ...w, status: newStatus } : w))
      );
    } catch (e) {
      console.error(e);
    }
  };

  const handleDragStart = (e: DragStartEvent) => {
    setActiveId(e.active.id as string);
  };

  const handleDragEnd = (e: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = e;
    if (!over || typeof active.id !== 'string') return;
    const status = COLUMNS.find((c) => c.id === over.id)?.id;
    if (status && active.id.startsWith('item-')) {
      const itemId = active.id.replace(/^item-/, '');
      moveItem(itemId, status);
    }
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    const title = addItemTitle.trim();
    if (!title || !teamId) return;
    setAddingItem(true);
    try {
      await createWorkItem({
        title,
        teamId,
        status: 'backlog',
        assigneeId: addItemAssigneeId || undefined,
      });
      setAddItemTitle('');
      setAddItemAssigneeId('');
      setShowAddItem(false);
      await loadBoard();
    } catch (err) {
      console.error(err);
    } finally {
      setAddingItem(false);
    }
  };

  const byStatus = (status: WorkItemStatus) =>
    workItems.filter((w) => w.status === status);

  const getAssigneeName = (assigneeId: string | undefined) =>
    assigneeId ? memberLabels[assigneeId] ?? assigneeId : null;

  const activeItem = activeId ? workItems.find((w) => `item-${w.id}` === activeId) : null;

  if (!teamId) {
    return (
      <Layout>
        <div style={{ padding: '40px 20px' }}>
          <Link to="/portal/leadership" style={{ color: '#002B4D', textDecoration: 'none' }}>← Back</Link>
          <p style={{ color: '#6b7280', marginTop: '16px' }}>Team not found.</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '40px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
          <Link
            to="/portal/leadership/teams"
            style={{ color: '#002B4D', textDecoration: 'none', fontSize: '0.95rem' }}
          >
            ← Back to teams
          </Link>
          <h1 style={{ color: '#002B4D', margin: 0, fontSize: '1.5rem', fontWeight: 700 }}>
            Team Board: {teamName || '…'}
          </h1>
          <div style={{ display: 'flex', gap: '10px' }}>
            <Link
              to={`/portal/leadership/teams/${teamId}`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 14px',
                background: '#fff',
                color: '#002B4D',
                border: '2px solid #002B4D',
                borderRadius: '8px',
                textDecoration: 'none',
                fontSize: '0.9rem',
                fontWeight: 600,
              }}
            >
              <FaUser /> Team page
            </Link>
            <Link
              to={`/portal/leadership/teams/${teamId}`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 14px',
                background: '#fff',
                color: '#002B4D',
                border: '2px solid #002B4D',
                borderRadius: '8px',
                textDecoration: 'none',
                fontSize: '0.9rem',
                fontWeight: 600,
              }}
            >
              <FaCog /> Settings
            </Link>
          </div>
        </div>

        {loading ? (
          <p style={{ color: '#6b7280' }}>Loading…</p>
        ) : (
          <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 0 }}>
              <div
                style={{
                  width: '100px',
                  flexShrink: 0,
                  paddingTop: '48px',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  color: '#374151',
                }}
              >
                STANDARD
              </div>
              <div style={{ display: 'flex', gap: '16px', overflowX: 'auto', paddingBottom: '16px', flex: 1, minWidth: 0 }}>
                {COLUMNS.map((col) => (
                  <Column
                    key={col.id}
                    column={col}
                    items={byStatus(col.id)}
                    memberLabels={memberLabels}
                    teamId={teamId}
                    isBacklog={col.id === 'backlog'}
                    showAddItem={showAddItem}
                    setShowAddItem={setShowAddItem}
                    addItemTitle={addItemTitle}
                    setAddItemTitle={setAddItemTitle}
                    addItemAssigneeId={addItemAssigneeId}
                    setAddItemAssigneeId={setAddItemAssigneeId}
                    memberIds={memberIds}
                    addingItem={addingItem}
                    onAddItem={handleAddItem}
                  />
                ))}
              </div>
            </div>

            <DragOverlay>
              {activeItem ? (
                <div
                  style={{
                    background: '#fff',
                    border: '2px solid #22c55e',
                    borderRadius: '8px',
                    padding: '12px',
                    minWidth: '220px',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
                    cursor: 'grabbing',
                  }}
                >
                  <CardContent item={activeItem} assigneeName={getAssigneeName(activeItem.assigneeId)} />
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        )}
      </div>
    </Layout>
  );
};

function DraggableCard({
  item,
  assigneeName,
}: {
  item: LeadershipWorkItem;
  assigneeName: string | null;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `item-${item.id}`,
    data: { item },
  });
  return (
    <div ref={setNodeRef} {...listeners} {...attributes}>
      <WorkItemCard item={item} assigneeName={assigneeName} isDragging={isDragging} />
    </div>
  );
}

function Column({
  column,
  items,
  memberLabels,
  teamId,
  isBacklog,
  showAddItem,
  setShowAddItem,
  addItemTitle,
  setAddItemTitle,
  addItemAssigneeId,
  setAddItemAssigneeId,
  memberIds,
  addingItem,
  onAddItem,
}: {
  column: (typeof COLUMNS)[0];
  items: LeadershipWorkItem[];
  memberLabels: Record<string, string>;
  teamId: string;
  isBacklog: boolean;
  showAddItem: boolean;
  setShowAddItem: (v: boolean) => void;
  addItemTitle: string;
  setAddItemTitle: (v: string) => void;
  addItemAssigneeId: string;
  setAddItemAssigneeId: (v: string) => void;
  memberIds: string[];
  addingItem: boolean;
  onAddItem: (e: React.FormEvent) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });

  return (
    <div
      ref={setNodeRef}
      style={{
        background: isOver ? '#f0fdf4' : '#f9fafb',
        borderRadius: '12px',
        padding: '16px',
        minWidth: '260px',
        minHeight: '200px',
        border: isOver ? '2px dashed #22c55e' : '1px solid #e5e7eb',
      }}
    >
      <div style={{ borderTop: `4px solid ${column.barColor}`, marginTop: '-16px', marginLeft: '-16px', marginRight: '-16px', marginBottom: '12px', borderRadius: '12px 12px 0 0' }} />
      <h3 style={{ color: '#002B4D', marginBottom: '12px', fontSize: '1rem', fontWeight: 600 }}>
        {column.label}
      </h3>
      {isBacklog && (
        <>
          {showAddItem ? (
            <form onSubmit={onAddItem} style={{ marginBottom: '12px' }}>
              <input
                type="text"
                value={addItemTitle}
                onChange={(e) => setAddItemTitle(e.target.value)}
                placeholder="Title"
                autoFocus
                style={{ width: '100%', padding: '8px 10px', marginBottom: '8px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px' }}
              />
              <select
                value={addItemAssigneeId}
                onChange={(e) => setAddItemAssigneeId(e.target.value)}
                style={{ width: '100%', padding: '8px 10px', marginBottom: '8px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px' }}
              >
                <option value="">No assignee</option>
                {memberIds.map((id) => (
                  <option key={id} value={id}>{memberLabels[id] || id}</option>
                ))}
              </select>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button type="submit" className="btn btn-primary" disabled={addingItem} style={{ padding: '6px 12px', fontSize: '0.85rem' }}>
                  {addingItem ? 'Adding…' : 'Add'}
                </button>
                <button type="button" className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.85rem' }} onClick={() => { setShowAddItem(false); setAddItemTitle(''); setAddItemAssigneeId(''); }}>
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setShowAddItem(true)}
              style={{
                width: '100%',
                padding: '16px',
                marginBottom: '12px',
                border: '2px dashed #d1d5db',
                borderRadius: '8px',
                background: '#fff',
                color: '#6b7280',
                fontSize: '0.9rem',
                cursor: 'pointer',
              }}
            >
              Add Item
            </button>
          )}
        </>
      )}
      {items.map((item) => (
        <DraggableCard
          key={item.id}
          item={item}
          assigneeName={memberLabels[item.assigneeId!] ?? item.assigneeId ?? null}
        />
      ))}
    </div>
  );
}

export default TeamBoardPage;
