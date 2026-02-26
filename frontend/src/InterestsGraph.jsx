import { useEffect, useMemo, useState } from "react";

const graphWidth = 320;
const graphHeight = 280;

const palette = ["#8c6bff", "#53d1ff", "#ff7dd4", "#84f6b9", "#ffc773", "#9fd0ff", "#d1a5ff"];

const defaultInterests = [
  "AI",
  "Наука",
  "Технологии",
  "Стартапы",
  "Дизайн",
  "Музыка",
  "Кино",
  "Спорт",
  "Психология",
  "Путешествия",
  "Образование",
  "Маркетинг",
  "Здоровье",
  "Финансы",
];

const baseLinks = [
  ["AI", "Технологии"],
  ["AI", "Наука"],
  ["AI", "Стартапы"],
  ["Технологии", "Дизайн"],
  ["Технологии", "Маркетинг"],
  ["Наука", "Образование"],
  ["Наука", "Здоровье"],
  ["Стартапы", "Финансы"],
  ["Маркетинг", "Финансы"],
  ["Музыка", "Кино"],
  ["Кино", "Дизайн"],
  ["Спорт", "Здоровье"],
  ["Психология", "Здоровье"],
  ["Психология", "Образование"],
  ["Путешествия", "Кино"],
  ["Путешествия", "Маркетинг"],
];

const labelToId = (label) => label.toLowerCase().replace(/\s+/g, "-");
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

function InterestsGraph({ selectedInterests, onSelectionChange }) {
  const [activeInterest, setActiveInterest] = useState(null);
  const [draggingNode, setDraggingNode] = useState(null);

  const allInterests = useMemo(
    () => Array.from(new Set([...defaultInterests, ...selectedInterests])),
    [selectedInterests],
  );

  const [nodes, setNodes] = useState([]);

  useEffect(() => {
    setNodes((previousNodes) => {
      const previousById = new Map(previousNodes.map((node) => [node.id, node]));

      return allInterests.map((label, index) => {
        const id = labelToId(label);
        const existingNode = previousById.get(id);

        if (existingNode) {
          return existingNode;
        }

        const angle = (index / allInterests.length) * Math.PI * 2;
        const radius = 90 + (index % 3) * 20;

        return {
          id,
          label,
          x: graphWidth / 2 + Math.cos(angle) * radius,
          y: graphHeight / 2 + Math.sin(angle) * radius,
          color: palette[index % palette.length],
        };
      });
    });
  }, [allInterests]);

  const links = useMemo(() => {
    const availableIds = new Set(nodes.map((node) => node.id));

    const common = baseLinks
      .map(([source, target]) => ({ source: labelToId(source), target: labelToId(target) }))
      .filter((link) => availableIds.has(link.source) && availableIds.has(link.target));

    const custom = nodes
      .filter((node) => !defaultInterests.includes(node.label))
      .flatMap((node, index) => {
        const fallbackA = defaultInterests[index % defaultInterests.length];
        const fallbackB = defaultInterests[(index + 5) % defaultInterests.length];
        return [
          { source: node.id, target: labelToId(fallbackA) },
          { source: node.id, target: labelToId(fallbackB) },
        ];
      })
      .filter((link) => availableIds.has(link.source) && availableIds.has(link.target));

    return [...common, ...custom];
  }, [nodes]);

  const nodesMap = useMemo(() => new Map(nodes.map((node) => [node.id, node])), [nodes]);

  const relatedNodeIds = useMemo(() => {
    if (!activeInterest) {
      return new Set();
    }

    const activeId = labelToId(activeInterest);
    const related = new Set([activeId]);

    links.forEach((link) => {
      if (link.source === activeId) {
        related.add(link.target);
      }
      if (link.target === activeId) {
        related.add(link.source);
      }
    });

    return related;
  }, [activeInterest, links]);

  const handleNodeClick = (label) => {
    const isSelected = selectedInterests.includes(label);
    onSelectionChange(isSelected ? selectedInterests.filter((item) => item !== label) : [...selectedInterests, label]);
    setActiveInterest(label);
  };

  const handlePointerMove = (event) => {
    if (!draggingNode) {
      return;
    }

    const svgRect = event.currentTarget.getBoundingClientRect();
    const x = clamp(event.clientX - svgRect.left, 24, graphWidth - 24);
    const y = clamp(event.clientY - svgRect.top, 24, graphHeight - 24);

    setNodes((previousNodes) =>
      previousNodes.map((node) => (node.id === draggingNode ? { ...node, x, y } : node)),
    );
  };

  return (
    <div className="interest-graph-wrap">
      <svg
        className="interest-graph"
        viewBox={`0 0 ${graphWidth} ${graphHeight}`}
        role="img"
        aria-label="Интерактивный граф интересов"
        onPointerMove={handlePointerMove}
        onPointerUp={() => setDraggingNode(null)}
        onPointerLeave={() => setDraggingNode(null)}
      >
        <defs>
          <radialGradient id="brain-bg" cx="50%" cy="50%" r="65%">
            <stop offset="0%" stopColor="rgba(92, 119, 255, 0.18)" />
            <stop offset="100%" stopColor="rgba(126, 43, 255, 0.04)" />
          </radialGradient>
        </defs>

        <rect x="0" y="0" width={graphWidth} height={graphHeight} fill="url(#brain-bg)" rx="16" />

        {links.map((link) => {
          const sourceNode = nodesMap.get(link.source);
          const targetNode = nodesMap.get(link.target);

          if (!sourceNode || !targetNode) {
            return null;
          }

          const activeId = activeInterest ? labelToId(activeInterest) : null;
          const highlighted =
            !activeId ||
            link.source === activeId ||
            link.target === activeId ||
            (relatedNodeIds.has(link.source) && relatedNodeIds.has(link.target));

          return (
            <line
              key={`${link.source}-${link.target}`}
              x1={sourceNode.x}
              y1={sourceNode.y}
              x2={targetNode.x}
              y2={targetNode.y}
              className={`interest-link ${highlighted ? "active" : "dimmed"}`}
            />
          );
        })}

        {nodes.map((node) => {
          const selected = selectedInterests.includes(node.label);
          const dimmed = activeInterest && !relatedNodeIds.has(node.id);

          return (
            <g
              key={node.id}
              transform={`translate(${node.x}, ${node.y})`}
              className={`interest-node ${selected ? "selected" : ""} ${dimmed ? "dimmed" : ""} ${
                activeInterest === node.label ? "active" : ""
              }`}
              onPointerDown={(event) => {
                event.currentTarget.setPointerCapture(event.pointerId);
                setDraggingNode(node.id);
                setActiveInterest(node.label);
              }}
              onClick={() => handleNodeClick(node.label)}
            >
              <circle r={selected ? 19 : 16} fill={node.color} />
              <text y="4" textAnchor="middle">
                {node.label.slice(0, 2).toUpperCase()}
              </text>
            </g>
          );
        })}
      </svg>

      <p className="interest-graph-tip">
        Перетаскивайте узлы и выбирайте интересы — связанные темы подсветятся автоматически.
      </p>
    </div>
  );
}

export default InterestsGraph;
