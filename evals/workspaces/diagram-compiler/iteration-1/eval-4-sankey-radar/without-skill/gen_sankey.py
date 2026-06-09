import matplotlib.pyplot as plt
from matplotlib.sankey import Sankey
import matplotlib
matplotlib.use('Agg')

# Use a CJK-capable font for Chinese text
matplotlib.rcParams['font.family'] = 'Arial Unicode MS'
matplotlib.rcParams['axes.unicode_minus'] = False

fig, ax = plt.subplots(figsize=(14, 5))

# Build the Sankey diagram as a single linear chain.
# Flows: Website(10000) -> Register(2500) -> Activate(1200) -> Pay(400) -> Renew(200)
# Drop-offs are implicit: the remaining flow exits at each step.

sankey = Sankey(
    ax=ax,
    scale=0.0001,
    offset=0.0,
    head_angle=150,
    format='%.0f',
    unit='',
    shoulder=0.03,
    tolerance=100,
)

# We chain them: each call adds a new stage, connecting to the previous outflow.
sankey.add(
    flows=[10000, -2500, -7500],
    orientations=[0, 0, 1],
    labels=['网站访问\n10,000', '注册账号\n2,500', '流失\n7,500'],
    patchlabel='',
    facecolor='#4A90D9',
    edgecolor='#333',
    alpha=0.85,
    trunklength=1.5,
    pathlengths=[1.0, 1.0, 0.8],
)  # stage 0

sankey.add(
    flows=[2500, -1200, -1300],
    orientations=[0, 0, 1],
    labels=['', '激活试用\n1,200', '流失\n1,300'],
    prior=0,
    connect=(1, 0),
    facecolor='#50B86C',
    edgecolor='#333',
    alpha=0.85,
    trunklength=1.5,
    pathlengths=[1.0, 1.0, 0.8],
)  # stage 1

sankey.add(
    flows=[1200, -400, -800],
    orientations=[0, 0, 1],
    labels=['', '首次付费\n400', '流失\n800'],
    prior=1,
    connect=(1, 0),
    facecolor='#F5A623',
    edgecolor='#333',
    alpha=0.85,
    trunklength=1.5,
    pathlengths=[1.0, 1.0, 0.8],
)  # stage 2

sankey.add(
    flows=[400, -200, -200],
    orientations=[0, 0, 1],
    labels=['', '续费\n200', '流失\n200'],
    prior=2,
    connect=(1, 0),
    facecolor='#E15554',
    edgecolor='#333',
    alpha=0.85,
    trunklength=1.5,
    pathlengths=[1.0, 1.0, 0.8],
)  # stage 3

diagrams = sankey.finish()

# Adjust label appearance
for d in diagrams:
    for t in d.texts:
        t.set_fontsize(11)
        t.set_fontweight('bold')
        t.set_fontfamily('Arial Unicode MS')

plt.title('SaaS 用户转化漏斗', fontsize=18, fontweight='bold', pad=20)
plt.subplots_adjust(left=0.05, right=0.95, top=0.88, bottom=0.05)
plt.tight_layout(pad=1.5)
plt.savefig(
    '/Users/huyongle/Desktop/workspace/skills/.skill-workspaces/diagram-studio/iteration-1/eval-4-sankey-radar/without-skill/outputs/sankey.png',
    dpi=200,
    bbox_inches='tight',
    facecolor='white',
    edgecolor='none',
)
plt.close()
print('Sankey diagram saved.')
