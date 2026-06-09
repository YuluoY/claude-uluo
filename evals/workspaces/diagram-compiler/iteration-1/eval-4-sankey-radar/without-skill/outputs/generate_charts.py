#!/usr/bin/env python3
"""Generate sankey diagram and radar chart PNGs for SaaS funnel analysis."""

import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from matplotlib.sankey import Sankey
import numpy as np
import os

OUTPUT_DIR = "/Users/huyongle/Desktop/workspace/skills/.skill-workspaces/diagram-studio/iteration-1/eval-4-sankey-radar/without-skill/outputs"

# ============================================================
# 1. Sankey Diagram - SaaS User Conversion Funnel
# ============================================================

fig = plt.figure(figsize=(14, 8))
ax = fig.add_subplot(1, 1, 1)

# Data: Website Visits(10000) -> Registered(2500) -> Trial(1200) -> Paid(400) -> Renewed(200)
# Using matplotlib Sankey - we build it as flows between stages

sankey = Sankey(ax=ax, scale=0.0001, offset=0.3, head_angle=135,
                format='%.0f', unit=' users')

# Stage 0 -> Stage 1: Website Visits to Registered
sankey.add(flows=[10000, -2500, -7500],
           labels=['Website Visits\n10,000', 'Registered\n2,500', 'Dropped\n7,500'],
           orientations=[0, 0, -1],
           pathlengths=[0.5, 0.5, 0.3],
           facecolor='#4A90D9',
           alpha=0.65)

# Stage 1 -> Stage 2: Registered to Trial Activated
sankey.add(flows=[2500, -1200, -1300],
           labels=['', 'Trial Activated\n1,200', 'Not Activated\n1,300'],
           orientations=[0, 0, -1],
           pathlengths=[0.5, 0.5, 0.3],
           prior=0, connect=(1, 0),
           facecolor='#50C878',
           alpha=0.65)

# Stage 2 -> Stage 3: Trial to First Payment
sankey.add(flows=[1200, -400, -800],
           labels=['', 'First Payment\n400', 'No Payment\n800'],
           orientations=[0, 0, -1],
           pathlengths=[0.5, 0.5, 0.3],
           prior=1, connect=(1, 0),
           facecolor='#F5A623',
           alpha=0.65)

# Stage 3 -> Stage 4: First Payment to Renewed
sankey.add(flows=[400, -200, -200],
           labels=['', 'Renewed\n200', 'Churned\n200'],
           orientations=[0, 0, -1],
           pathlengths=[0.5, 0.5, 0.3],
           prior=2, connect=(1, 0),
           facecolor='#E74C3C',
           alpha=0.65)

diagrams = sankey.finish()

# Add conversion rate annotations
conversion_labels = [
    ('25.0%', 0.15, 0.78),
    ('48.0%', 0.37, 0.78),
    ('33.3%', 0.59, 0.78),
    ('50.0%', 0.81, 0.78),
]
for text, x, y in conversion_labels:
    plt.text(x, y, text, transform=fig.transFigure, fontsize=10,
             fontweight='bold', color='#333333',
             bbox=dict(boxstyle='round,pad=0.3', facecolor='white', alpha=0.8, edgecolor='#cccccc'))

plt.title('SaaS User Conversion Funnel', fontsize=16, fontweight='bold', pad=20)
plt.figtext(0.5, 0.01, 'Website Visits 10,000 -> Registered 2,500 -> Trial Activated 1,200 -> First Payment 400 -> Renewed 200',
            ha='center', fontsize=10, color='#666666')

sankey_path = os.path.join(OUTPUT_DIR, 'sankey.png')
plt.savefig(sankey_path, dpi=150, bbox_inches='tight', facecolor='white')
plt.close()
print(f"Sankey diagram saved to: {sankey_path}")

# ============================================================
# 2. Radar Chart - Technical Solution Comparison
# ============================================================

categories = ['Performance', 'Maintainability', 'Dev Efficiency', 'Community', 'Learning Cost', 'Extensibility']
categories_display = ['Performance', 'Maintainability', 'Dev\nEfficiency',
                       'Community\nEcosystem', 'Learning\nCost', 'Extensibility']

# Scores for each solution
solution_a = [8, 7, 5, 9, 4, 9]  # Microservices
solution_b = [6, 8, 9, 7, 8, 6]  # Modular Monolith
solution_c = [9, 6, 8, 5, 7, 8]  # Serverless

N = len(categories)
angles = [n / float(N) * 2 * np.pi for n in range(N)]
angles += angles[:1]  # Close the polygon

# Extend data to close polygons
solution_a_closed = solution_a + solution_a[:1]
solution_b_closed = solution_b + solution_b[:1]
solution_c_closed = solution_c + solution_c[:1]

fig, ax = plt.subplots(figsize=(9, 9), subplot_kw=dict(polar=True))
fig.patch.set_facecolor('white')

# Draw polygons with fill
ax.fill(angles, solution_a_closed, alpha=0.15, color='#E74C3C')
ax.plot(angles, solution_a_closed, 'o-', linewidth=2.2, color='#E74C3C', label='Solution A: Microservices', markersize=6)

ax.fill(angles, solution_b_closed, alpha=0.15, color='#3498DB')
ax.plot(angles, solution_b_closed, 's-', linewidth=2.2, color='#3498DB', label='Solution B: Modular Monolith', markersize=6)

ax.fill(angles, solution_c_closed, alpha=0.15, color='#2ECC71')
ax.plot(angles, solution_c_closed, '^--', linewidth=2.2, color='#2ECC71', label='Solution C: Serverless', markersize=6)

# Set labels
ax.set_xticks(angles[:-1])
ax.set_xticklabels(categories_display, fontsize=10, fontweight='bold')

# Set y-axis
ax.set_ylim(0, 10)
ax.set_yticks([2, 4, 6, 8, 10])
ax.set_yticklabels(['2', '4', '6', '8', '10'], fontsize=8, color='#999999')
ax.set_rlabel_position(30)

# Grid styling
ax.grid(True, linestyle='--', alpha=0.5, color='#cccccc')

# Legend
legend = ax.legend(loc='upper right', bbox_to_anchor=(1.35, 1.12), fontsize=10,
                   framealpha=0.9, edgecolor='#dddddd')
legend.get_frame().set_facecolor('white')

plt.title('Technical Solution Comparison', fontsize=15, fontweight='bold', pad=30, color='#333333')

# Annotate scores on chart
for i, (angle, a_val, b_val, c_val) in enumerate(zip(angles[:-1], solution_a, solution_b, solution_c)):
    r_offset = 0.6
    ax.annotate(str(a_val), xy=(angle, a_val), fontsize=8, fontweight='bold',
                color='#E74C3C', ha='center', va='bottom',
                textcoords='offset points', xytext=(0, 4))
    ax.annotate(str(b_val), xy=(angle, b_val), fontsize=8, fontweight='bold',
                color='#3498DB', ha='center', va='bottom',
                textcoords='offset points', xytext=(0, -10))
    ax.annotate(str(c_val), xy=(angle, c_val), fontsize=8, fontweight='bold',
                color='#2ECC71', ha='center', va='bottom',
                textcoords='offset points', xytext=(0, 4))

radar_path = os.path.join(OUTPUT_DIR, 'radar.png')
plt.savefig(radar_path, dpi=150, bbox_inches='tight', facecolor='white')
plt.close()
print(f"Radar chart saved to: {radar_path}")

print("Done! Both PNGs generated.")
