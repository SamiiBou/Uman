import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { gsap } from 'gsap';
import * as d3 from 'd3';
import { FaProjectDiagram, FaSearch, FaMinus, FaPlus } from 'react-icons/fa';
import { API_BASE_URL } from '../config';

const FriendMap = () => {
  const { user, token } = useAuth();
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [loading, setLoading] = useState(true);
  const svgRef = useRef(null);
  const containerRef = useRef(null);
  const simulationRef = useRef(null);
  const tooltipRef = useRef(null);
  const gsapAnimationsRef = useRef([]);
  
  // Build the friend map data
  useEffect(() => {
    if (!user || !token) return;
    
    (async () => {
      setLoading(true);
      try {
        // Fetch current user's friends
        const res = await axios.get(`${API_BASE_URL}/users/connections`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        const userId = user._id;
        const userName = user.name || 'You';
        const friends = res.data.friends || [];
        
        // Nodes: user + friends
        const allNodes = [
          { id: userId, name: userName, group: 'user' }, 
          ...friends.map(f => ({ ...f, group: 'friend' }))
        ];
        
        // Edges: user <-> each friend
        const allEdges = friends.map(f => ({ 
          source: userId, 
          target: f.id,
          type: 'direct'
        }));
        
        // Fetch each friend's friends to link among them
        const friendIds = friends.map(f => f.id);
        await Promise.all(friends.map(async f => {
          try {
            const friendRes = await axios.get(`${API_BASE_URL}/users/${f.id}/connections`, {
              headers: { Authorization: `Bearer ${token}` }
            });
            
            (friendRes.data.friends || []).forEach(ff => {
              if (friendIds.includes(ff.id)) {
                const exists = allEdges.some(e => 
                  (e.source === f.id && e.target === ff.id) ||
                  (e.source === ff.id && e.target === f.id)
                );
                
                if (!exists) {
                  allEdges.push({ 
                    source: f.id, 
                    target: ff.id, 
                    type: 'mutual'
                  });
                }
              }
            });
          } catch (err) {
            console.error(`Error fetching map for ${f.id}:`, err);
          }
        }));
        
        setNodes(allNodes);
        setEdges(allEdges);
      } catch (err) {
        console.error('Error building friend map:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, [user, token]);

  // Cleanup function for GSAP animations
  const cleanupGSAP = () => {
    gsapAnimationsRef.current.forEach(animation => {
      if (animation) {
        animation.kill();
      }
    });
    gsapAnimationsRef.current = [];
  };

  // Render using D3 and GSAP
  useEffect(() => {
    if (loading || nodes.length === 0 || !svgRef.current) return;
    
    // Clean up previous GSAP animations
    cleanupGSAP();
    
    // Get container dimensions
    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;
    
    // Setup SVG with zoom behavior
    const svg = d3.select(svgRef.current)
      .attr('viewBox', [0, 0, width, height])
      .attr('width', '100%')
      .attr('height', '100%');
    
    // Clear previous elements
    svg.selectAll('*').remove();
    
    // Create gradient definitions
    const defs = svg.append('defs');
    
    // Radial gradient for user node
    const userGradient = defs.append('radialGradient')
      .attr('id', 'user-gradient')
      .attr('cx', '50%')
      .attr('cy', '50%')
      .attr('r', '50%');
      
    userGradient.append('stop')
      .attr('offset', '0%')
      .attr('stop-color', '#9D50BB');
      
    userGradient.append('stop')
      .attr('offset', '100%')
      .attr('stop-color', '#6E48AA');
    
    // Radial gradient for friend nodes
    const friendGradient = defs.append('radialGradient')
      .attr('id', 'friend-gradient')
      .attr('cx', '50%')
      .attr('cy', '50%')
      .attr('r', '50%');
      
    friendGradient.append('stop')
      .attr('offset', '0%')
      .attr('stop-color', '#4facfe');
      
    friendGradient.append('stop')
      .attr('offset', '100%')
      .attr('stop-color', '#00f2fe');
    
    // Linear gradient for links
    const linkGradient = defs.append('linearGradient')
      .attr('id', 'link-gradient')
      .attr('gradientUnits', 'userSpaceOnUse');
      
    linkGradient.append('stop')
      .attr('offset', '0%')
      .attr('stop-color', '#9D50BB')
      .attr('stop-opacity', 0.6);
      
    linkGradient.append('stop')
      .attr('offset', '100%')
      .attr('stop-color', '#4facfe')
      .attr('stop-opacity', 0.6);
    
    // Glow filters
    // User node glow
    const userGlow = defs.append('filter')
      .attr('id', 'glow-user')
      .attr('x', '-50%')
      .attr('y', '-50%')
      .attr('width', '200%')
      .attr('height', '200%');
    
    userGlow.append('feGaussianBlur')
      .attr('stdDeviation', '4')
      .attr('result', 'coloredBlur');
    
    const userMerge = userGlow.append('feMerge');
    userMerge.append('feMergeNode')
      .attr('in', 'coloredBlur');
    userMerge.append('feMergeNode')
      .attr('in', 'SourceGraphic');
    
    // Friend node glow
    const friendGlow = defs.append('filter')
      .attr('id', 'glow-friend')
      .attr('x', '-50%')
      .attr('y', '-50%')
      .attr('width', '200%')
      .attr('height', '200%');
    
    friendGlow.append('feGaussianBlur')
      .attr('stdDeviation', '2.5')
      .attr('result', 'coloredBlur');
    
    const friendMerge = friendGlow.append('feMerge');
    friendMerge.append('feMergeNode')
      .attr('in', 'coloredBlur');
    friendMerge.append('feMergeNode')
      .attr('in', 'SourceGraphic');
    
    // Create a container group for zoom/pan
    const g = svg.append('g').attr('class', 'container');
    
    // Zoom behavior
    const zoom = d3.zoom()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });
    
    svg.call(zoom);
    
    // Reset to center with animation
    const resetView = () => {
      svg.transition()
        .duration(750)
        .call(zoom.transform, d3.zoomIdentity.translate(width / 2, height / 2).scale(0.8));
    };
    
    // Center the view initially
    resetView();
    
    // Create links
    const linkGroup = g.append('g')
      .attr('class', 'links');
      
    const link = linkGroup.selectAll('line')
      .data(edges)
      .enter()
      .append('line')
      .attr('stroke', d => d.type === 'direct' ? 'url(#link-gradient)' : '#2a2a3a')
      .attr('stroke-width', d => d.type === 'direct' ? 2 : 1.5)
      .attr('opacity', 0)
      .attr('stroke-dasharray', d => d.type === 'mutual' ? '5, 3' : '0')
      .style('pointer-events', 'none');
    
    // Create node groups
    const nodeGroup = g.append('g')
      .attr('class', 'nodes')
      .selectAll('g')
      .data(nodes)
      .enter()
      .append('g')
      .attr('class', d => `node ${d.group}`)
      .style('cursor', 'pointer')
      .attr('opacity', 0);
    
    // Node circles with rings
    nodeGroup.append('circle')
      .attr('class', 'node-ring')
      .attr('r', d => d.group === 'user' ? 38 : 22)
      .attr('fill', 'none')
      .attr('stroke', d => d.group === 'user' ? '#9D50BB' : '#4facfe')
      .attr('stroke-width', 2)
      .attr('opacity', 0.3);
    
    nodeGroup.append('circle')
      .attr('class', 'node-circle')
      .attr('r', d => d.group === 'user' ? 32 : 18)
      .attr('fill', d => d.group === 'user' ? 'url(#user-gradient)' : 'url(#friend-gradient)')
      .attr('filter', d => d.group === 'user' ? 'url(#glow-user)' : 'url(#glow-friend)');
    
    // Pulse animation for user node
    nodeGroup.filter(d => d.group === 'user').each(function() {
      const pulseRing = d3.select(this).append('circle')
        .attr('r', 38)
        .attr('fill', 'none')
        .attr('stroke', '#9D50BB')
        .attr('stroke-width', 1)
        .attr('opacity', 0.6);
      
      const pulseAnimation = gsap.to(pulseRing.node(), {
        attr: { r: 48, 'stroke-width': 0.5 },
        opacity: 0,
        duration: 2,
        repeat: -1,
        ease: 'power1.out'
      });
      
      gsapAnimationsRef.current.push(pulseAnimation);
    });
    
    // Node labels with background
    const labels = nodeGroup.append('g')
      .attr('class', 'label-group')
      .attr('transform', d => `translate(0, ${d.group === 'user' ? 48 : 30})`);
    
    // Label background
    labels.append('rect')
      .attr('rx', 4)
      .attr('ry', 4)
      .attr('x', d => -d.name.length * 3.5)
      .attr('y', -12)
      .attr('width', d => d.name.length * 7)
      .attr('height', 16)
      .attr('fill', 'rgba(10, 10, 20, 0.7)')
      .attr('opacity', 0.8);
    
    // Label text
    labels.append('text')
      .attr('text-anchor', 'middle')
      .attr('fill', '#ffffff')
      .style('font-size', d => d.group === 'user' ? '13px' : '11px')
      .style('font-weight', d => d.group === 'user' ? '500' : '400')
      .style('pointer-events', 'none')
      .text(d => d.name);
    
    // Icon inside user node
    nodeGroup.filter(d => d.group === 'user').append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', 5)
      .attr('fill', '#ffffff')
      .style('font-size', '16px')
      .style('font-weight', 'bold')
      .style('pointer-events', 'none')
      .text('YOU');
    
    // Setup drag behavior
    const dragBehavior = d3.drag()
      .on('start', dragStarted)
      .on('drag', dragged)
      .on('end', dragEnded);
    
    nodeGroup.call(dragBehavior);
    
    // Highlight effect
    nodeGroup.on('mouseover', function(event, d) {
      // Highlight connected nodes and links
      const connectedNodeIds = edges
        .filter(e => e.source.id === d.id || e.target.id === d.id)
        .flatMap(e => [e.source.id, e.target.id]);
      
      const uniqueConnected = [...new Set(connectedNodeIds)];
      
      // Dim non-connected nodes
      nodeGroup.transition().duration(300)
        .attr('opacity', n => uniqueConnected.includes(n.id) || n.id === d.id ? 1 : 0.2);
      
      // Highlight connected links
      link.transition().duration(300)
        .attr('opacity', l => 
          (l.source.id === d.id || l.target.id === d.id) ? 0.8 : 0.1
        )
        .attr('stroke-width', l => 
          (l.source.id === d.id || l.target.id === d.id) ? (l.type === 'direct' ? 3 : 2) : (l.type === 'direct' ? 2 : 1.5)
        );
      
      // Enlarge current node
      d3.select(this).select('.node-circle')
        .transition()
        .duration(300)
        .attr('r', d.group === 'user' ? 36 : 22);
      
      d3.select(this).select('.node-ring')
        .transition()
        .duration(300)
        .attr('r', d.group === 'user' ? 42 : 26);
      
      // Show tooltip
      showTooltip(event, d);
    })
    .on('mouseout', function() {
      // Restore all nodes and links
      nodeGroup.transition().duration(300).attr('opacity', 1);
      link.transition().duration(300)
        .attr('opacity', 0.6)
        .attr('stroke-width', d => d.type === 'direct' ? 2 : 1.5);
      
      // Restore node size
      d3.select(this).select('.node-circle')
        .transition()
        .duration(300)
        .attr('r', d => d.group === 'user' ? 32 : 18);
      
      d3.select(this).select('.node-ring')
        .transition()
        .duration(300)
        .attr('r', d => d.group === 'user' ? 38 : 22);
      
      // Hide tooltip
      hideTooltip();
    })
    .on('click', function(event, d) {
      // Create ripple effect on click
      const circle = d3.select(this).select('.node-circle');
      const r = parseFloat(circle.attr('r'));
      
      const ripple = d3.select(this).append('circle')
        .attr('r', r)
        .attr('fill', 'none')
        .attr('stroke', '#ffffff')
        .attr('stroke-width', 2)
        .attr('opacity', 1);
      
      const rippleAnim = gsap.to(ripple.node(), {
        attr: { r: r * 2.5 },
        opacity: 0,
        duration: 1,
        onComplete: () => ripple.remove()
      });
      
      gsapAnimationsRef.current.push(rippleAnim);
    });
    
    // Create tooltip if it doesn't exist
    if (!tooltipRef.current) {
      tooltipRef.current = d3.select('body').append('div')
        .attr('class', 'network-tooltip')
        .style('position', 'absolute')
        .style('visibility', 'hidden')
        .style('background-color', 'rgba(15, 15, 25, 0.85)')
        .style('color', 'white')
        .style('padding', '10px 14px')
        .style('border-radius', '6px')
        .style('pointer-events', 'none')
        .style('font-size', '12px')
        .style('font-family', 'sans-serif')
        .style('z-index', '1000')
        .style('box-shadow', '0 4px 12px rgba(0, 0, 0, 0.3)')
        .style('border-left', '3px solid #9D50BB')
        .style('max-width', '200px')
        .style('backdrop-filter', 'blur(4px)')
        .style('opacity', '0')
        .style('transform', 'translateY(10px)');
    }
    
    function showTooltip(event, d) {
      const connectionCount = edges.filter(e => 
        e.source.id === d.id || e.target.id === d.id
      ).length;
      
      const tooltip = tooltipRef.current;
      
      tooltip
        .style('visibility', 'visible')
        .style('left', `${event.pageX + 10}px`)
        .style('top', `${event.pageY - 10}px`)
        .html(`
          <div style="font-weight: 600; margin-bottom: 4px; font-size: 14px; color: ${d.group === 'user' ? '#c39bd3' : '#7fb3d5'}">${d.name}</div>
          <div style="display: flex; align-items: center; margin-top: 6px;">
            <svg width="14" height="14" viewBox="0 0 24 24" style="margin-right: 6px;">
              <path fill="currentColor" d="M12,5.5A3.5,3.5 0 0,1 15.5,9A3.5,3.5 0 0,1 12,12.5A3.5,3.5 0 0,1 8.5,9A3.5,3.5 0 0,1 12,5.5M5,8C5.56,8 6.08,8.15 6.53,8.42C6.38,9.85 6.8,11.27 7.66,12.38C7.16,13.34 6.16,14 5,14A3,3 0 0,1 2,11A3,3 0 0,1 5,8M19,8A3,3 0 0,1 22,11A3,3 0 0,1 19,14C17.84,14 16.84,13.34 16.34,12.38C17.2,11.27 17.62,9.85 17.47,8.42C17.92,8.15 18.44,8 19,8M5.5,18.25C5.5,16.18 8.41,14.5 12,14.5C15.59,14.5 18.5,16.18 18.5,18.25V20H5.5V18.25M0,20V18.5C0,17.11 1.89,15.94 4.45,15.6C3.86,16.28 3.5,17.22 3.5,18.25V20H0M24,20H20.5V18.25C20.5,17.22 20.14,16.28 19.55,15.6C22.11,15.94 24,17.11 24,18.5V20Z" />
            </svg>
            ${connectionCount} connexion${connectionCount !== 1 ? 's' : ''}
          </div>
        `);
      
      gsap.to(tooltip, {
        opacity: 1,
        y: 0,
        duration: 0.3,
        ease: 'power2.out'
      });
    }
    
    function hideTooltip() {
      const tooltip = tooltipRef.current;
      
      gsap.to(tooltip, {
        opacity: 0,
        y: 10,
        duration: 0.2,
        ease: 'power2.in',
        onComplete: () => {
          tooltip.style('visibility', 'hidden');
        }
      });
    }
    
    // Force simulation
    const simulation = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(edges)
        .id(d => d.id)
        .distance(d => d.type === 'direct' ? 120 : 160)
        .strength(d => d.type === 'direct' ? 0.6 : 0.3))
      .force('charge', d3.forceManyBody()
        .strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(d => d.group === 'user' ? 60 : 40))
      .on('tick', () => {
        link
          .attr('x1', d => d.source.x)
          .attr('y1', d => d.source.y)
          .attr('x2', d => d.target.x)
          .attr('y2', d => d.target.y);
        
        nodeGroup.attr('transform', d => `translate(${d.x},${d.y})`);
        
        // Update link gradient positions dynamically
        edges.forEach((d, i) => {
          // Create a unique gradient ID for each link
          const gradientId = `link-gradient-${i}`;
          
          // Check if the gradient already exists, if not, create it
          if (!defs.select(`#${gradientId}`).node()) {
            const linkGrad = defs.append('linearGradient')
              .attr('id', gradientId)
              .attr('gradientUnits', 'userSpaceOnUse');
              
            linkGrad.append('stop')
              .attr('offset', '0%')
              .attr('stop-color', d.source.group === 'user' ? '#9D50BB' : '#4facfe')
              .attr('stop-opacity', 0.7);
              
            linkGrad.append('stop')
              .attr('offset', '100%')
              .attr('stop-color', d.target.group === 'user' ? '#9D50BB' : '#4facfe')
              .attr('stop-opacity', 0.7);
          }
          
          // Update gradient positions
          defs.select(`#${gradientId}`)
            .attr('x1', d.source.x)
            .attr('y1', d.source.y)
            .attr('x2', d.target.x)
            .attr('y2', d.target.y);
          
          // Update link to use its specific gradient
          if (d.type === 'direct') {
            d3.select(link.nodes()[i])
              .attr('stroke', `url(#${gradientId})`);
          }
        });
      });
    
    simulationRef.current = simulation;
    
    // Animate in elements using GSAP
    const linkAnim = gsap.to(link.nodes(), {
      opacity: 0.6,
      duration: 1.2,
      stagger: 0.02,
      ease: 'power2.out'
    });
    
    gsapAnimationsRef.current.push(linkAnim);
    
    const nodeAnim = gsap.to(nodeGroup.nodes(), {
      opacity: 1,
      duration: 0.8,
      stagger: 0.05,
      ease: 'back.out(1.7)'
    });
    
    gsapAnimationsRef.current.push(nodeAnim);
    
    // Drag functions
    function dragStarted(event, d) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }
    
    function dragged(event, d) {
      d.fx = event.x;
      d.fy = event.y;
    }
    
    function dragEnded(event, d) {
      if (!event.active) simulation.alphaTarget(0);
      if (d.group !== 'user') {
        d.fx = null;
        d.fy = null;
      }
    }
    
    // Pin the user node to center initially
    const userNode = nodes.find(n => n.group === 'user');
    if (userNode) {
      userNode.fx = width / 2;
      userNode.fy = height / 2;
      
      // After initial positioning, allow the user node to be dragged
      setTimeout(() => {
        simulation.alpha(0.1).restart();
        setTimeout(() => {
          userNode.fx = null;
          userNode.fy = null;
        }, 1500);
      }, 2000);
    }
    
    // Cleanup function
    return () => {
      cleanupGSAP();
      if (simulationRef.current) {
        simulationRef.current.stop();
      }
    };
  }, [loading, nodes, edges]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (simulationRef.current) {
        const container = containerRef.current;
        if (!container) return;
        
        const width = container.clientWidth;
        const height = container.clientHeight;
        
        simulationRef.current
          .force('center', d3.forceCenter(width / 2, height / 2))
          .alpha(0.3)
          .restart();
      }
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (tooltipRef.current) {
        tooltipRef.current.remove();
        tooltipRef.current = null;
      }
      cleanupGSAP();
    };
  }, []);

  return (
    <div style={{ textAlign: 'center', padding: '1rem', fontFamily: 'system-ui, sans-serif' }}>
      <div 
        ref={containerRef} 
        style={{ 
          width: '100%', 
          height: '80vh', 
          backgroundColor: '#0a0a16', 
          backgroundImage: 'radial-gradient(circle at 50% 50%, #131324, #0a0a16)',
          borderRadius: '12px',
          overflow: 'hidden',
          position: 'relative',
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)'
        }}
      >
        {loading ? (
          <div style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            height: '100%',
            color: '#ffffff'
          }}>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center'
            }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                border: '3px solid rgba(255, 255, 255, 0.1)',
                borderTopColor: '#9D50BB',
                animation: 'spin 1s linear infinite',
                marginBottom: '16px'
              }} />
              <p style={{ 
                fontSize: '14px', 
                letterSpacing: '1px',
                opacity: 0.8 
              }}>Création de votre carte de connexions...</p>
            </div>
          </div>
        ) : (
          <>
            <div style={{
              position: 'absolute',
              top: '20px',
              left: '20px',
              zIndex: 10,
              display: 'flex',
              alignItems: 'center',
              color: '#ffffff',
            }}>
              <FaProjectDiagram style={{ 
                marginRight: '10px', 
                color: '#9D50BB', 
                fontSize: '20px' 
              }} />
              <h1 style={{ 
                fontSize: '22px', 
                margin: 0,
                fontWeight: 500,
                letterSpacing: '1px'
              }}>
                Carte des Connexions
              </h1>
            </div>
            
            <svg 
              ref={svgRef} 
              style={{ 
                width: '100%', 
                height: '100%'
              }}
            />
            
            <div style={{
              position: 'absolute',
              bottom: '20px',
              left: '50%',
              transform: 'translateX(-50%)',
              display: 'flex',
              gap: '12px',
              zIndex: 10
            }}>
              <button 
                onClick={() => {
                  const svg = d3.select(svgRef.current);
                  svg.transition()
                    .duration(750)
                    .call(
                      d3.zoom().transform,
                      d3.zoomIdentity.translate(
                        containerRef.current.clientWidth / 2, 
                        containerRef.current.clientHeight / 2
                      ).scale(0.8)
                    );
                }}
                style={{
                  backgroundColor: 'rgba(20, 20, 30, 0.7)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '10px 16px',
                  cursor: 'pointer',
                  backdropFilter: 'blur(4px)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '13px',
                  letterSpacing: '0.5px',
                  transition: 'background-color 0.2s',
                  boxShadow: '0 2px 10px rgba(0, 0, 0, 0.2)'
                }}
              >
                <FaSearch style={{ fontSize: '12px' }} />
                Réinitialiser la vue
              </button>
              
              <div style={{
                display: 'flex',
                alignItems: 'center',
                backgroundColor: 'rgba(20, 20, 30, 0.7)',
                borderRadius: '6px',
                overflow: 'hidden',
                backdropFilter: 'blur(4px)',
                boxShadow: '0 2px 10px rgba(0, 0, 0, 0.2)'
              }}>
                <button
                  onClick={() => {
                    const svg = d3.select(svgRef.current);
                    svg.transition()
                      .duration(400)
                      .call(
                        d3.zoom().scaleBy, 0.7
                      );
                  }}
                  style={{
                    backgroundColor: 'transparent',
                    color: 'white',
                    border: 'none',
                    padding: '10px 12px',
                    cursor: 'pointer',
                    fontSize: '13px',
                    transition: 'background-color 0.2s'
                  }}
                >
                  <FaMinus style={{ fontSize: '12px' }} />
                </button>
                
                <button
                  onClick={() => {
                    const svg = d3.select(svgRef.current);
                    svg.transition()
                      .duration(400)
                      .call(
                        d3.zoom().scaleBy, 1.3
                      );
                  }}
                  style={{
                    backgroundColor: 'transparent',
                    color: 'white',
                    border: 'none',
                    padding: '10px 12px',
                    cursor: 'pointer',
                    fontSize: '13px',
                    transition: 'background-color 0.2s'
                  }}
                >
                  <FaPlus style={{ fontSize: '12px' }} />
                </button>
              </div>
            </div>
            
            <div style={{
              position: 'absolute',
              bottom: '20px',
              right: '20px',
              color: 'rgba(255, 255, 255, 0.6)',
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '20px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ 
                  width: '12px', 
                  height: '2px', 
                  background: 'url(#link-gradient)',
                  boxShadow: '0 0 5px rgba(156, 39, 176, 0.5)'
                }}></div>
                <span>Connexion directe</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ 
                  width: '12px', 
                  height: '2px', 
                  background: '#2a2a3a',
                  borderTop: '1px dashed #2a2a3a'
                }}></div>
                <span>Connexion mutuelle</span>
              </div>
            </div>
          </>
        )}
      </div>
      <style jsx global>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        button:hover {
          background-color: rgba(35, 35, 50, 0.9) !important;
        }
        
        .node:hover {
          filter: saturate(1.2);
        }
        
        .network-tooltip {
          transition: opacity 0.3s, transform 0.3s;
        }
      `}</style>
      
      <div style={{
        marginTop: '16px',
        color: '#888',
        fontSize: '13px',
        display: 'flex',
        justifyContent: 'center',
        gap: '8px'
      }}>
        <span>👋</span>
        <span>Utiliser le zoom ou faites glisser les nœuds pour explorer les connexions</span>
      </div>
    </div>
  );
};

export default FriendMap;