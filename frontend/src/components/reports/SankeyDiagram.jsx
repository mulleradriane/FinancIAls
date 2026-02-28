import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { sankey, sankeyLinkHorizontal } from 'd3-sankey';
import PrivateValue from '@/components/ui/PrivateValue';
import { Card } from '@/components/ui/card';
import { usePrivacy } from '@/context/PrivacyContext';

const SankeyDiagram = ({ data }) => {
  const { isPrivate } = usePrivacy();
  const svgRef = useRef(null);
  const containerRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 500 });
  const [hoveredLink, setHoveredLink] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      if (entries.length > 0) {
        const { width } = entries[0].contentRect;
        setDimensions(prev => ({ ...prev, width }));
      }
    });

    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  useEffect(() => {
    // Validação rigorosa dos dados
    if (!data) {
      console.log('SankeyDiagram: Nenhum dado fornecido');
      return;
    }
    
    if (!data.nodes || !Array.isArray(data.nodes) || data.nodes.length === 0) {
      console.log('SankeyDiagram: Nós ausentes ou vazios');
      return;
    }
    
    if (!data.links || !Array.isArray(data.links) || data.links.length === 0) {
      console.log('SankeyDiagram: Links ausentes ou vazios');
      return;
    }
    
    if (dimensions.width === 0) {
      console.log('SankeyDiagram: Largura zero, aguardando resize');
      return;
    }

    // Valida se todos os links têm source, target e value válidos
    const invalidLinks = data.links.filter(l => 
      l.source === undefined || 
      l.target === undefined || 
      typeof l.value !== 'number' || 
      isNaN(l.value) || 
      l.value <= 0
    );
    
    if (invalidLinks.length > 0) {
      console.warn('SankeyDiagram: Links inválidos encontrados:', invalidLinks);
      return;
    }

    const margin = { top: 20, right: 100, bottom: 20, left: 100 };
    const width = Math.max(100, dimensions.width - margin.left - margin.right);
    const height = Math.max(100, dimensions.height - margin.top - margin.bottom);

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const g = svg.append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const sankeyGenerator = sankey()
      .nodeWidth(12)
      .nodePadding(20)
      .extent([[0, 0], [width, height]]);

    // D3-sankey modifica os dados de entrada, então clonamos
    const inputData = {
      nodes: data.nodes.map(d => ({ ...d })),
      links: data.links.map(d => ({ ...d }))
    };

    try {
      const { nodes, links } = sankeyGenerator(inputData);
      
      // Verifica se o layout foi calculado corretamente
      const invalidNodes = nodes.filter(n => 
        isNaN(n.x0) || isNaN(n.x1) || isNaN(n.y0) || isNaN(n.y1) ||
        n.x0 === undefined || n.x1 === undefined || n.y0 === undefined || n.y1 === undefined
      );
      
      if (invalidNodes.length > 0) {
        console.warn('SankeyDiagram: Nós com layout inválido:', invalidNodes);
        return;
      }

      // Links
      g.append("g")
        .attr("fill", "none")
        .selectAll("path")
        .data(links)
        .join("path")
        .attr("d", sankeyLinkHorizontal())
        .attr("stroke", d => d.source.color || "hsl(var(--muted))")
        .attr("stroke-width", d => Math.max(1, d.width))
        .attr("stroke-opacity", 0.25)
        .on("mouseenter", (event, d) => {
          d3.select(event.currentTarget).transition().duration(200).attr("stroke-opacity", 0.6);
          setHoveredLink(d);
          setTooltipPos({ x: event.clientX, y: event.clientY });
        })
        .on("mousemove", (event) => {
          setTooltipPos({ x: event.clientX, y: event.clientY });
        })
        .on("mouseleave", (event) => {
          d3.select(event.currentTarget).transition().duration(200).attr("stroke-opacity", 0.25);
          setHoveredLink(null);
        });

      // Nodes
      const node = g.append("g")
        .selectAll("g")
        .data(nodes)
        .join("g");

      node.append("rect")
        .attr("x", d => d.x0)
        .attr("y", d => d.y0)
        .attr("height", d => d.y1 - d.y0)
        .attr("width", d => d.x1 - d.x0)
        .attr("fill", d => d.color || "hsl(var(--muted))")
        .attr("rx", 3);

      node.append("text")
        .attr("x", d => d.x0 < width / 2 ? d.x1 + 8 : d.x0 - 8)
        .attr("y", d => (d.y1 + d.y0) / 2)
        .attr("dy", "0.35em")
        .attr("text-anchor", d => d.x0 < width / 2 ? "start" : "end")
        .text(d => d.name)
        .attr("class", "text-[11px] font-bold tracking-tight")
        .attr("fill", "hsl(var(--foreground))")
        .style("pointer-events", "none");

      node.append("text")
        .attr("x", d => d.x0 < width / 2 ? d.x1 + 8 : d.x0 - 8)
        .attr("y", d => (d.y1 + d.y0) / 2 + 12)
        .attr("dy", "0.35em")
        .attr("text-anchor", d => d.x0 < width / 2 ? "start" : "end")
        .attr("class", "text-[9px] opacity-60 font-medium")
        .attr("fill", "hsl(var(--foreground))")
        .style("pointer-events", "none")
        .text(d => {
          if (d.value <= 0) return "";
          if (isPrivate) return "R$ •••••";
          return d.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        });

    } catch (e) {
      console.error("Sankey diagram error:", e);
    }

  }, [data, dimensions, isPrivate]);

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  // Verificação rápida para o estado de carregamento/dados vazios
  const hasValidData = data && 
    Array.isArray(data.nodes) && data.nodes.length > 0 &&
    Array.isArray(data.links) && data.links.length > 0 &&
    data.links.some(l => l.value > 0);

  if (!hasValidData) return null;

  return (
    <div ref={containerRef} className="w-full relative min-h-[500px] bg-card/30 rounded-3xl p-4 border border-border/50 mb-8">
      <svg
        ref={svgRef}
        width={dimensions.width}
        height={dimensions.height}
        className="w-full h-auto overflow-visible"
      />
      {hoveredLink && (
        <div
          className="fixed z-[100] pointer-events-none transition-transform duration-75"
          style={{
            top: tooltipPos.y - 10,
            left: tooltipPos.x + 15,
            transform: 'translateY(-100%)'
          }}
        >
          <Card className="p-3 shadow-2xl border-none bg-background/95 backdrop-blur-md ring-1 ring-border">
            <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest mb-1 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: hoveredLink.source.color }} />
              {hoveredLink.source.name}
              <span className="opacity-30">→</span>
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: hoveredLink.target.color }} />
              {hoveredLink.target.name}
            </p>
            <p className="text-lg font-black tracking-tighter">
              <PrivateValue value={formatCurrency(hoveredLink.value)} />
            </p>
          </Card>
        </div>
      )}
    </div>
  );
};

export default SankeyDiagram;