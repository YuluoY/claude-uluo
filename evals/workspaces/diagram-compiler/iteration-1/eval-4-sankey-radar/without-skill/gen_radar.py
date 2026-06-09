import matplotlib.pyplot as plt
import numpy as np
import matplotlib
matplotlib.use('Agg')

# Use a CJK-capable font for Chinese text
matplotlib.rcParams['font.family'] = 'Arial Unicode MS'
matplotlib.rcParams['axes.unicode_minus'] = False

# --- Data ---
categories = ['性能', '可维护性', '开发效率', '社区生态', '学习成本', '扩展性']
categories_en = ['Performance', 'Maintainability', 'Dev Efficiency',
                 'Ecosystem', 'Learning Curve', 'Scalability']

# Scores for each solution (out of 10)
scores = {
    '方案A\n微服务':      [8, 7, 5, 9, 4, 9],
    '方案B\n模块化单体':  [6, 8, 9, 7, 8, 6],
    '方案C\nServerless': [9, 6, 8, 5, 7, 8],
}

colors = ['#4A90D9', '#50B86C', '#E15554']
line_styles = ['-', '--', '-.']

N = len(categories)
angles = np.linspace(0, 2 * np.pi, N, endpoint=False).tolist()
angles += angles[:1]  # close the polygon

# --- Plot ---
fig, ax = plt.subplots(figsize=(8, 8), subplot_kw={'projection': 'polar'})
ax.set_theta_offset(np.pi / 2)
ax.set_theta_direction(-1)

# Draw grid lines and labels
ax.set_xticks(angles[:-1])
ax.set_xticklabels(categories, fontsize=13, fontweight='bold')

ax.set_ylim(0, 10)
ax.set_yticks([2, 4, 6, 8, 10])
ax.set_yticklabels(['2', '4', '6', '8', '10'], fontsize=9, color='grey')
ax.yaxis.grid(True, linestyle=':', alpha=0.6, color='grey')
ax.xaxis.grid(True, linestyle=':', alpha=0.6, color='grey')

for (label, values), color, ls in zip(scores.items(), colors, line_styles):
    values += values[:1]  # close
    ax.fill(angles, values, alpha=0.07, color=color)
    ax.plot(angles, values, color=color, linewidth=2.5, linestyle=ls, label=label, marker='o', markersize=7)

# Legend
legend = ax.legend(
    loc='upper right',
    bbox_to_anchor=(1.32, 1.1),
    fontsize=11,
    frameon=True,
    fancybox=True,
    shadow=False,
    borderpad=0.8,
    labelspacing=1.2,
)
legend.get_frame().set_alpha(0.9)

plt.title('技术方案六维对比雷达图', fontsize=17, fontweight='bold', pad=28)
plt.tight_layout(pad=3)
plt.savefig(
    '/Users/huyongle/Desktop/workspace/skills/.skill-workspaces/diagram-studio/iteration-1/eval-4-sankey-radar/without-skill/outputs/radar.png',
    dpi=200,
    bbox_inches='tight',
    facecolor='white',
    edgecolor='none',
)
plt.close()
print('Radar chart saved.')
