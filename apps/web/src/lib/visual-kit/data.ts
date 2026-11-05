import { Diagram } from "./types";

export const VISUAL_KIT_DIAGRAMS: Diagram[] = [
  // ==========================================
  // 1. HUMAN HEART
  // ==========================================
  {
    id: "human-heart",
    title: "Human Heart Anatomy & Blood Circulation",
    area: "Human anatomy",
    summary:
      "A dual-pump muscular organ featuring four chambers, four unidirectional valves, and major systemic and pulmonary blood vessels.",
    viewBox: { w: 600, h: 480 },
    discussionQuestions: [
      "Why is the muscular myocardium of the left ventricle significantly thicker than that of the right ventricle?",
      "Trace the path of an erythrocyte from the inferior vena cava until it exits through the aorta. Where does it pick up oxygen?",
      "How do the atrioventricular and semilunar valves prevent backflow, and what produces the characteristic 'lub-dub' heart sound?",
    ],
    decorations: [
      // Pericardium & background silhouette outline
      {
        type: "path",
        d: "M 180 150 C 120 200 120 360 270 440 C 440 440 480 320 480 200 C 480 140 420 120 380 130 Z",
        fill: "var(--card-subtle, #f8fafc)",
        stroke: "var(--border-subtle, #e2e8f0)",
        strokeWidth: 2,
        opacity: 0.7,
      },
      // Systemic septum (muscular divider)
      {
        type: "path",
        d: "M 290 190 Q 295 300 295 430",
        stroke: "var(--septum, #94a3b8)",
        strokeWidth: 14,
        strokeLinecap: "round",
        fill: "none",
      },
      // Blue blood flow arrows (Deoxygenated: right heart)
      {
        type: "path",
        d: "M 190 120 L 190 170 Q 200 220 220 240 Q 220 310 240 340 Q 260 300 270 230 Q 280 180 290 140",
        stroke: "#0284c7",
        strokeWidth: 3,
        strokeDasharray: "6 4",
        fill: "none",
        opacity: 0.8,
      },
      // Red blood flow arrows (Oxygenated: left heart)
      {
        type: "path",
        d: "M 440 180 Q 400 200 380 240 Q 370 310 360 350 Q 340 310 330 240 Q 330 180 345 120",
        stroke: "#dc2626",
        strokeWidth: 3,
        strokeDasharray: "6 4",
        fill: "none",
        opacity: 0.8,
      },
    ],
    parts: [
      {
        id: "superior-vena-cava",
        name: "Superior Vena Cava",
        colorKey: "blue",
        anchor: { x: 190, y: 80 },
        shape: {
          type: "path",
          d: "M 170 50 L 170 140 C 170 160 200 160 210 140 L 210 50 Z",
          fill: "#38bdf8",
          stroke: "#0284c7",
          strokeWidth: 2.5,
        },
        function: "Transports deoxygenated blood from the upper half of the body (head, neck, and arms) into the right atrium.",
        details:
          "It is a large-diameter vein situated in the anterior right superior mediastinum. Because it drains the upper body under gravity, it lacks venous valves.",
        teachingTip:
          "Use a blue marker to trace blood returning from students' brains down into the superior vena cava to reinforce deoxygenated flow.",
        funFact: "It carries roughly 2.5 liters of venous blood per minute into the right atrium at rest.",
      },
      {
        id: "inferior-vena-cava",
        name: "Inferior Vena Cava",
        colorKey: "blue",
        anchor: { x: 190, y: 410 },
        shape: {
          type: "path",
          d: "M 170 370 L 170 450 L 210 450 L 210 370 Z",
          fill: "#38bdf8",
          stroke: "#0284c7",
          strokeWidth: 2.5,
        },
        function: "Drains deoxygenated venous blood from the abdomen, pelvis, and lower extremities back to the right atrium.",
        details:
          "It is the largest vein in the human body, ascending through the posterior abdominal wall to pierce the diaphragm at the caval opening.",
        teachingTip:
          "Contrast the superior vena cava (upper body) with the inferior vena cava (lower body) as the two primary return conduits.",
        commonMisconception: "Students often mistake veins for carrying blue liquid; emphasize that venous blood is dark maroon, appearing bluish through skin.",
      },
      {
        id: "right-atrium",
        name: "Right Atrium",
        colorKey: "blue",
        anchor: { x: 210, y: 210 },
        shape: {
          type: "path",
          d: "M 160 170 C 145 220 155 260 220 260 C 235 240 235 180 215 165 Z",
          fill: "#7dd3fc",
          stroke: "#0284c7",
          strokeWidth: 2.5,
        },
        function: "Receives deoxygenated systemic venous return and propels it through the tricuspid valve into the right ventricle.",
        details:
          "Contains the sinoatrial (SA) node in its upper wall, which serves as the natural electrical pacemaker generating rhythm for heart contractions.",
        teachingTip:
          "Introduce the SA node here: ask learners why this chamber needs to contract slightly before the ventricles.",
        funFact: "The wall of the atrium is relatively thin compared to the ventricle because it only pumps blood a short distance past the valve.",
      },
      {
        id: "tricuspid-valve",
        name: "Tricuspid Valve",
        colorKey: "slate",
        anchor: { x: 230, y: 280 },
        shape: {
          type: "path",
          d: "M 205 270 Q 230 285 255 270",
          stroke: "#475569",
          strokeWidth: 5,
          strokeLinecap: "round",
          fill: "none",
        },
        function: "Prevents backflow of blood from the right ventricle into the right atrium during ventricular systole.",
        details:
          "Consists of three fibrous cusps attached to chordae tendineae ('heartstrings'), which anchor to papillary muscles inside the ventricle.",
        teachingTip:
          "Have learners associate 'tri' with the right side by remembering that 'R' comes before 'L' and three comes before two (bicuspid).",
        commonMisconception: "Valves do not pump blood; they open and close passively in response to hydrostatic pressure gradients.",
      },
      {
        id: "right-ventricle",
        name: "Right Ventricle",
        colorKey: "blue",
        anchor: { x: 230, y: 360 },
        shape: {
          type: "path",
          d: "M 170 300 C 180 380 230 420 280 410 C 285 360 270 290 230 290 Z",
          fill: "#bae6fd",
          stroke: "#0284c7",
          strokeWidth: 2.5,
        },
        function: "Pumps deoxygenated blood through the pulmonary valve into the pulmonary trunk toward the lungs.",
        details:
          "Forms the largest part of the anterior surface of the heart. Its walls are moderately muscular but thinner than the left ventricle due to low pulmonary resistance.",
        teachingTip:
          "Ask students why the right ventricle only needs about 25 mmHg of pressure while the left ventricle needs 120 mmHg.",
      },
      {
        id: "pulmonary-valve",
        name: "Pulmonary Valve",
        colorKey: "slate",
        anchor: { x: 280, y: 230 },
        shape: {
          type: "path",
          d: "M 265 220 Q 280 235 295 220",
          stroke: "#475569",
          strokeWidth: 5,
          strokeLinecap: "round",
          fill: "none",
        },
        function: "Prevents pulmonary trunk blood from leaking back into the right ventricle during diastole.",
        details:
          "A semilunar valve composed of three pocket-like cusps that catch backward-surging blood when ventricular pressure drops.",
        teachingTip:
          "Demonstrate semilunar valve cusps with a small parachute or cup analogy that fills up to snap shut.",
      },
      {
        id: "pulmonary-artery",
        name: "Pulmonary Artery",
        colorKey: "blue",
        anchor: { x: 300, y: 110 },
        shape: {
          type: "path",
          d: "M 270 180 L 280 120 Q 285 90 250 80 L 250 50 Q 310 65 315 120 L 310 180 Z",
          fill: "#38bdf8",
          stroke: "#0284c7",
          strokeWidth: 2.5,
        },
        function: "Carries deoxygenated blood from the heart to the lungs for gaseous exchange.",
        details:
          "The main pulmonary trunk divides into right and left branches. It is one of the few arteries in the adult body carrying deoxygenated blood.",
        teachingTip:
          "Remind students that 'arteries carry blood Away from the heart,' regardless of oxygenation status.",
        commonMisconception: "Students often believe all arteries carry oxygenated blood; highlight the pulmonary artery as the classic exception.",
      },
      {
        id: "aorta",
        name: "Aorta",
        colorKey: "red",
        anchor: { x: 370, y: 75 },
        shape: {
          type: "path",
          d: "M 320 130 C 320 60 410 40 430 110 L 400 120 C 390 85 345 90 345 130 Z",
          fill: "#f87171",
          stroke: "#dc2626",
          strokeWidth: 2.5,
        },
        function: "The primary systemic arterial trunk delivering high-pressure oxygenated blood to all organs and tissues of the body.",
        details:
          "Its elastic walls expand during ventricular ejection (systole) and recoil during diastole (Windkessel effect), smoothing blood flow downstream.",
        teachingTip:
          "Point out the three brachiocephalic branches at the aortic arch that provide immediate oxygen to the brain and arms.",
        funFact: "At roughly 2.5 to 3 centimeters in diameter, the aorta is as wide as a garden hose.",
      },
      {
        id: "left-atrium",
        name: "Left Atrium",
        colorKey: "red",
        anchor: { x: 390, y: 205 },
        shape: {
          type: "path",
          d: "M 370 160 C 430 165 440 220 400 250 C 380 240 370 190 370 160 Z",
          fill: "#fca5a5",
          stroke: "#dc2626",
          strokeWidth: 2.5,
        },
        function: "Receives newly oxygenated blood returning from both lungs via the four pulmonary veins.",
        details:
          "Forms most of the posterior surface (base) of the heart and channels blood across the mitral valve into the left ventricle.",
        teachingTip:
          "Have learners observe that oxygenated blood from both right and left lungs converges here in the left atrium.",
      },
      {
        id: "mitral-valve",
        name: "Mitral Valve",
        colorKey: "slate",
        anchor: { x: 370, y: 275 },
        shape: {
          type: "path",
          d: "M 350 265 Q 370 280 395 265",
          stroke: "#475569",
          strokeWidth: 5,
          strokeLinecap: "round",
          fill: "none",
        },
        function: "Prevents retrograde flow of blood from the high-pressure left ventricle into the left atrium during systole.",
        details:
          "Also known as the bicuspid valve because it possesses two heavy-duty leaflets shaped like a bishop's miter headwear.",
        teachingTip:
          "Note that mitral valve regurgitation is the most common heart valve disorder taught in secondary biology.",
      },
      {
        id: "aortic-valve",
        name: "Aortic Valve",
        colorKey: "slate",
        anchor: { x: 320, y: 270 },
        shape: {
          type: "path",
          d: "M 310 260 Q 325 275 340 260",
          stroke: "#475569",
          strokeWidth: 5,
          strokeLinecap: "round",
          fill: "none",
        },
        function: "Maintains unidirectional flow from the left ventricle into the ascending aorta.",
        details:
          "A three-cusp semilunar valve positioned behind the pulmonary valve; coronary artery openings (ostia) originate just above its cusps.",
        teachingTip:
          "Explain that coronary circulation feeds the heart muscle itself right when the aortic valve snaps shut during diastole.",
      },
      {
        id: "left-ventricle",
        name: "Left Ventricle",
        colorKey: "red",
        anchor: { x: 370, y: 370 },
        shape: {
          type: "path",
          d: "M 310 290 C 320 370 360 430 420 390 C 440 330 420 280 370 290 Z",
          fill: "#fecaca",
          stroke: "#dc2626",
          strokeWidth: 3,
        },
        function: "Pumps oxygen-rich blood into the aorta against systemic vascular resistance to nourish the entire body.",
        details:
          "Its myocardial wall is 3 times thicker than the right ventricle, enabling it to generate peak systolic pressures of ~120 mmHg.",
        teachingTip:
          "Ask students to physically place their hand on the left side of their chest to explain why the heartbeat is felt strongest there.",
        funFact: "In a single lifetime, the left ventricle pumps enough blood to fill roughly three supertankers.",
      },
      {
        id: "pulmonary-veins",
        name: "Pulmonary Veins",
        colorKey: "red",
        anchor: { x: 455, y: 175 },
        shape: {
          type: "path",
          d: "M 440 160 L 490 150 L 490 190 L 440 185 Z",
          fill: "#f87171",
          stroke: "#dc2626",
          strokeWidth: 2.5,
        },
        function: "Carry freshly oxygenated blood from alveolar capillaries back to the left atrium.",
        details:
          "There are typically four pulmonary veins (two from each lung). Like pulmonary arteries, they break the general rule by carrying oxygenated blood in veins.",
        teachingTip:
          "Reinforce the pair: pulmonary arteries carry deoxygenated blood away; pulmonary veins bring oxygenated blood toward.",
        commonMisconception: "Students often categorize vessels solely by color; teach them that direction of flow relative to the heart defines artery vs. vein.",
      },
    ],
  },

  // ==========================================
  // 2. DIGESTIVE SYSTEM
  // ==========================================
  {
    id: "digestive-system",
    title: "Human Digestive System & Nutrient Breakdown",
    area: "Human anatomy",
    summary:
      "The gastrointestinal tract and accessory digestive organs responsible for mechanical mastication, enzymatic breakdown, nutrient absorption, and waste elimination.",
    viewBox: { w: 600, h: 500 },
    discussionQuestions: [
      "How do the structural adaptations of the small intestine (villi and microvilli) optimize nutrient absorption surface area?",
      "Why is hydrochloric acid in the stomach essential for pepsin activation, and what protects the gastric mucosa from autodigestion?",
      "Compare the functional roles of the liver, gallbladder, and pancreas as accessory digestive organs.",
    ],
    decorations: [
      // Torso body contour silhouette
      {
        type: "path",
        d: "M 200 40 Q 270 20 340 40 Q 370 120 360 220 Q 390 320 360 470 L 180 470 Q 150 320 180 220 Q 170 120 200 40 Z",
        fill: "var(--card-subtle, #f8fafc)",
        stroke: "var(--border-subtle, #e2e8f0)",
        strokeWidth: 2,
        opacity: 0.6,
      },
      // Peristaltic flow path down esophagus
      {
        type: "line",
        x1: 270,
        y1: 65,
        x2: 270,
        y2: 180,
        stroke: "#f97316",
        strokeWidth: 2,
        strokeDasharray: "4 4",
      },
    ],
    parts: [
      {
        id: "mouth",
        name: "Mouth",
        colorKey: "amber",
        anchor: { x: 270, y: 50 },
        shape: {
          type: "ellipse",
          cx: 270,
          cy: 50,
          rx: 35,
          ry: 20,
          fill: "#fed7aa",
          stroke: "#ea580c",
          strokeWidth: 2.5,
        },
        function: "Initiates mechanical digestion via chewing and chemical digestion via salivary amylase.",
        details:
          "Salivary glands secrete saliva containing amylase and lipase to moisten food into an easily swallowable bolus.",
        teachingTip:
          "Have students chew a plain cracker for two minutes to observe how it tastes progressively sweeter as starch breaks down into maltose.",
        funFact: "The human mouth produces between 0.75 and 1.5 liters of saliva every single day.",
      },
      {
        id: "esophagus",
        name: "Esophagus",
        colorKey: "amber",
        anchor: { x: 270, y: 130 },
        shape: {
          type: "rect",
          x: 260,
          y: 75,
          width: 20,
          height: 110,
          rx: 8,
          fill: "#ffedd5",
          stroke: "#ea580c",
          strokeWidth: 2.5,
        },
        function: "Transports food boluses from the pharynx to the stomach through coordinated peristaltic contractions.",
        details:
          "A muscular tube roughly 25 cm long composed of striated muscle in the upper third and smooth muscle in the lower third.",
        teachingTip:
          "Explain peristalsis by having students squeeze a marble or ping-pong ball through a flexible sock.",
        commonMisconception: "Gravity is not required for swallowing; peristalsis works even when an astronaut is in microgravity or hanging upside down.",
      },
      {
        id: "stomach",
        name: "Stomach",
        colorKey: "amber",
        anchor: { x: 340, y: 210 },
        shape: {
          type: "path",
          d: "M 280 185 C 330 180 380 200 370 240 C 360 270 300 280 285 240 C 275 210 270 190 280 185 Z",
          fill: "#fdba74",
          stroke: "#c2410c",
          strokeWidth: 2.5,
        },
        function: "Stores ingested food, churning it with gastric juice containing HCl and pepsin to form chyme.",
        details:
          "Highly acidic pH (1.5 to 3.5) denatures proteins and kills pathogens. Chief cells secrete pepsinogen, which acid activates into pepsin.",
        teachingTip:
          "Discuss why the stomach has rugae (folds) that allow it to expand dramatically after a large meal.",
        funFact: "The stomach wall replaces its mucus epithelial lining every 3 to 5 days to prevent self-digestion.",
      },
      {
        id: "liver",
        name: "Liver",
        colorKey: "amber",
        anchor: { x: 220, y: 200 },
        shape: {
          type: "polygon",
          points: "190,180 265,185 255,245 185,225",
          fill: "#b45309",
          stroke: "#78350f",
          strokeWidth: 2.5,
        },
        function: "Produces bile salts for fat emulsification, metabolizes absorbed nutrients, and detoxifies chemicals.",
        details:
          "The largest internal organ, receiving dual blood supply from the hepatic artery and nutrient-rich hepatic portal vein.",
        teachingTip:
          "Emphasize the difference between mechanical emulsification by bile and chemical enzymatic breakdown by lipases.",
      },
      {
        id: "gallbladder",
        name: "Gallbladder",
        colorKey: "emerald",
        anchor: { x: 250, y: 255 },
        shape: {
          type: "ellipse",
          cx: 250,
          cy: 255,
          rx: 16,
          ry: 12,
          fill: "#86efac",
          stroke: "#15803d",
          strokeWidth: 2.5,
        },
        function: "Stores and concentrates bile synthesized by the liver until signaled to release it into the duodenum.",
        details:
          "When fatty chyme enters the duodenum, cholecystokinin (CCK) stimulates the gallbladder to contract and discharge bile down the common bile duct.",
        teachingTip:
          "Remind students that the gallbladder stores bile, while the liver produces it; gallbladder removal patients simply avoid heavy fats.",
      },
      {
        id: "pancreas",
        name: "Pancreas",
        colorKey: "yellow",
        anchor: { x: 310, y: 270 },
        shape: {
          type: "path",
          d: "M 270 265 C 310 255 350 265 355 275 C 345 285 300 285 270 275 Z",
          fill: "#fde047",
          stroke: "#a16207",
          strokeWidth: 2.5,
        },
        function: "Secretes alkaline digestive enzymes (amylase, trypsin, lipase) and systemic hormones (insulin and glucagon).",
        details:
          "Bicarbonate ions in pancreatic juice neutralize acidic gastric chyme, creating an optimal slightly basic pH for intestinal enzymes.",
        teachingTip:
          "Highlight its dual role: exocrine (digestive enzymes into ducts) and endocrine (insulin/glucagon into blood).",
      },
      {
        id: "small-intestine",
        name: "Small Intestine",
        colorKey: "amber",
        anchor: { x: 290, y: 350 },
        shape: {
          type: "path",
          d: "M 240 320 C 270 300 320 310 320 340 C 320 360 260 350 260 370 C 260 390 320 380 310 400 C 290 410 250 400 240 370 Z",
          fill: "#fed7aa",
          stroke: "#ea580c",
          strokeWidth: 2.5,
        },
        function: "The primary site for final chemical digestion and absorption of nutrients, water, and minerals.",
        details:
          "Divided into duodenum, jejunum, and ileum. Circular folds, villi, and microvilli create an absorptive surface area of over 30 square meters.",
        teachingTip:
          "Use a folded paper towel or plush towel to physically show students how microscopic folding increases contact area for absorption.",
        funFact: "If unraveled, the adult small intestine measures about 6 meters (20 feet) in length.",
      },
      {
        id: "large-intestine",
        name: "Large Intestine",
        colorKey: "amber",
        anchor: { x: 200, y: 330 },
        shape: {
          type: "path",
          d: "M 210 400 L 210 290 C 210 270 350 270 350 290 L 350 400 L 325 400 L 325 305 C 325 295 235 295 235 305 L 235 400 Z",
          fill: "#fb923c",
          stroke: "#9a3412",
          strokeWidth: 2.5,
        },
        function: "Reabsorbs water, salts, and vitamins produced by gut microflora, condensing indigestible residue into feces.",
        details:
          "Consists of cecum, ascending, transverse, descending, and sigmoid colon. Trillions of symbiotic bacteria ferment residual fibers and synthesize vitamin K.",
        teachingTip:
          "Connect large intestine dehydration to health: slow transit causes constipation; rapid transit causes diarrhea and dehydration.",
      },
      {
        id: "rectum",
        name: "Rectum",
        colorKey: "amber",
        anchor: { x: 290, y: 440 },
        shape: {
          type: "rect",
          x: 275,
          y: 415,
          width: 30,
          height: 45,
          rx: 6,
          fill: "#ea580c",
          stroke: "#9a3412",
          strokeWidth: 2.5,
        },
        function: "Temporarily stores fecal matter until stretch receptors stimulate defecation reflexes.",
        details:
          "Terminates at the anal canal, regulated by an involuntary internal anal sphincter (smooth muscle) and voluntary external anal sphincter (skeletal muscle).",
        teachingTip:
          "Discuss neural reflex control: involuntary autonomic stretch signaling coupled with voluntary somatic muscular control.",
      },
    ],
  },

  // ==========================================
  // 3. ANIMAL CELL
  // ==========================================
  {
    id: "animal-cell",
    title: "Animal Cell Ultrastructure & Organelles",
    area: "Biological systems",
    summary:
      "A eukaryotic cell model showing membrane-bound organelles that govern genetic replication, protein synthesis, cellular respiration, and waste processing.",
    viewBox: { w: 600, h: 480 },
    discussionQuestions: [
      "How does the endomembrane system (nucleus -> rough ER -> Golgi apparatus -> vesicles) coordinate protein synthesis and export?",
      "Why is the inner mitochondrial membrane deeply folded into cristae, and how does this relate to ATP synthase efficiency?",
      "Contrast the selective permeability of the cell membrane with organelle compartmentalization.",
    ],
    decorations: [
      // Cytosol background fill
      {
        type: "ellipse",
        cx: 300,
        cy: 250,
        rx: 235,
        ry: 185,
        fill: "var(--card-subtle, #f8fafc)",
        stroke: "none",
      },
      // Microtubules / cytoskeleton filaments
      {
        type: "path",
        d: "M 150 180 Q 220 200 320 160 M 200 350 Q 280 320 390 350",
        stroke: "var(--border-subtle, #cbd5e1)",
        strokeWidth: 1.5,
        strokeDasharray: "3 3",
        fill: "none",
      },
    ],
    parts: [
      {
        id: "cell-membrane",
        name: "Cell Membrane",
        colorKey: "teal",
        anchor: { x: 80, y: 240 },
        shape: {
          type: "ellipse",
          cx: 300,
          cy: 250,
          rx: 235,
          ry: 185,
          fill: "none",
          stroke: "#0d9488",
          strokeWidth: 6,
        },
        function: "Encloses cytoplasm and regulates selective movement of ions and molecules into and out of the cell.",
        details:
          "A phospholipid bilayer with embedded cholesterol, transmembrane transport proteins, and surface receptor glycoproteins forming the fluid mosaic model.",
        teachingTip:
          "Have students visualize soap bubbles or oil drops in water to understand hydrophobic fatty acid tails and hydrophilic phosphate heads.",
        funFact: "The plasma membrane is only about 7 to 10 nanometers thick.",
      },
      {
        id: "cytoplasm",
        name: "Cytoplasm",
        colorKey: "emerald",
        anchor: { x: 150, y: 130 },
        shape: {
          type: "circle",
          cx: 170,
          cy: 140,
          r: 25,
          fill: "#a7f3d0",
          stroke: "#059669",
          strokeWidth: 2,
        },
        function: "A gelatinous aqueous cytosol suspending organelles and hosting glycolysis and metabolic enzymatic reactions.",
        details:
          "Composed of water, dissolved salts, amino acids, and cytoskeletal actin microfilaments and tubulin microtubules that give the cell structural shape.",
        teachingTip:
          "Clarify the distinction between cytosol (the fluid solution) and cytoplasm (the fluid plus all organelles except the nucleus).",
      },
      {
        id: "nucleus",
        name: "Nucleus",
        colorKey: "purple",
        anchor: { x: 280, y: 240 },
        shape: {
          type: "circle",
          cx: 280,
          cy: 220,
          r: 65,
          fill: "#e9d5ff",
          stroke: "#7e22ce",
          strokeWidth: 3,
        },
        function: "The control center storing genomic DNA, directing transcription, and coordinating cell division.",
        details:
          "Enclosed by a perforated double-membrane nuclear envelope with nuclear pores that govern RNA and ribosomal protein transport.",
        teachingTip:
          "Compare the nucleus to a master library containing blueprints (DNA) that cannot leave, so copies (mRNA) are dispatched instead.",
      },
      {
        id: "nucleolus",
        name: "Nucleolus",
        colorKey: "purple",
        anchor: { x: 280, y: 175 },
        shape: {
          type: "circle",
          cx: 280,
          cy: 200,
          r: 24,
          fill: "#a855f7",
          stroke: "#6b21a8",
          strokeWidth: 2,
        },
        function: "A dense non-membrane nuclear subregion responsible for ribosomal RNA (rRNA) transcription and ribosome subunit assembly.",
        details:
          "Assembles rRNA transcripts with imported ribosomal proteins before shipping small and large subunits through nuclear pores.",
        teachingTip:
          "Help students remember: the nucleolus is the 'factory inside the nucleus' that builds ribosomes.",
      },
      {
        id: "mitochondrion",
        name: "Mitochondrion",
        colorKey: "amber",
        anchor: { x: 440, y: 150 },
        shape: {
          type: "path",
          d: "M 410 130 C 460 110 490 140 480 180 C 470 210 420 190 400 170 C 390 150 400 135 410 130 Z",
          fill: "#fed7aa",
          stroke: "#ea580c",
          strokeWidth: 2.5,
        },
        function: "Generates cellular ATP energy via the Krebs cycle and oxidative phosphorylation.",
        details:
          "Contains an inner membrane folded into cristae to maximize surface area for ATP synthase, along with its own circular mitochondrial DNA (mDNA).",
        teachingTip:
          "Discuss the endosymbiotic theory: mitochondria evolved from ancient aerobic bacteria engulfed by ancestral eukaryotes.",
        funFact: "Active cells like human heart muscle contain upwards of 2,000 mitochondria per single cell.",
      },
      {
        id: "rough-er",
        name: "Rough ER",
        colorKey: "blue",
        anchor: { x: 220, y: 320 },
        shape: {
          type: "path",
          d: "M 200 280 Q 230 300 210 330 Q 240 340 230 360",
          stroke: "#2563eb",
          strokeWidth: 6,
          strokeLinecap: "round",
          fill: "none",
        },
        function: "Synthesizes, folds, and modifies transmembrane and secretable proteins tagged for transport.",
        details:
          "Studded on its outer cytosolic surface with ribosomes. Nascent polypeptide chains thread into the lumen where chaperones fold them into tertiary structures.",
        teachingTip:
          "Contrast 'rough' (ribosome-studded, making proteins) with 'smooth' (lipid synthesis and detoxification).",
      },
      {
        id: "smooth-er",
        name: "Smooth ER",
        colorKey: "blue",
        anchor: { x: 150, y: 360 },
        shape: {
          type: "path",
          d: "M 130 330 Q 160 350 140 375 Q 170 380 160 400",
          stroke: "#60a5fa",
          strokeWidth: 5,
          strokeLinecap: "round",
          fill: "none",
        },
        function: "Synthesizes lipids, phospholipids, and steroid hormones, and detoxifies drugs and metabolic toxins.",
        details:
          "Lacks ribosomes. In skeletal muscle cells, specialized smooth ER (sarcoplasmic reticulum) regulates intracellular calcium ion storage and release.",
        teachingTip:
          "Ask learners why human liver cells contain exceptionally dense smooth endoplasmic reticulum networks.",
      },
      {
        id: "golgi-apparatus",
        name: "Golgi Apparatus",
        colorKey: "rose",
        anchor: { x: 420, y: 320 },
        shape: {
          type: "path",
          d: "M 390 280 C 440 290 440 310 395 315 M 395 325 C 445 335 445 355 400 360",
          stroke: "#e11d48",
          strokeWidth: 5,
          strokeLinecap: "round",
          fill: "none",
        },
        function: "Modifies, packages, and sorts proteins received from the rough ER into transport vesicles for intra- or extracellular targets.",
        details:
          "Composed of flattened membranous sacs called cisternae with distinct polarity: cis face (entry from ER) and trans face (exit towards membrane).",
        teachingTip:
          "Use the postal shipping center analogy: receiving packages, attaching molecular destination barcodes, and dispatching shipping containers.",
      },
      {
        id: "ribosomes",
        name: "Ribosomes",
        colorKey: "indigo",
        anchor: { x: 350, y: 390 },
        shape: {
          type: "circle",
          cx: 350,
          cy: 375,
          r: 6,
          fill: "#4338ca",
          stroke: "#312e81",
          strokeWidth: 1.5,
        },
        function: "Translates messenger RNA nucleotide codons into corresponding polypeptide amino acid sequences.",
        details:
          "Non-membrane ribonucleoprotein complexes composed of a small 40S subunit (mRNA decoding) and large 60S subunit (peptide bond synthesis).",
        teachingTip:
          "Emphasize that ribosomes exist both freely suspended in the cytosol and docked to the rough ER membrane.",
      },
      {
        id: "lysosome",
        name: "Lysosome",
        colorKey: "red",
        anchor: { x: 460, y: 230 },
        shape: {
          type: "circle",
          cx: 460,
          cy: 230,
          r: 16,
          fill: "#f87171",
          stroke: "#b91c1c",
          strokeWidth: 2,
        },
        function: "Contains hydrolytic acid enzymes to break down engulfed foreign pathogens, cellular debris, and worn-out organelles (autophagy).",
        details:
          "Operates at an acidic lumen pH (~4.5 to 5.0) maintained by proton-pumping ATPases, preventing destructive accidental cytosolic breakdown if leakage occurs.",
        teachingTip:
          "Compare lysosomes to cellular recycling bins or security demolition crews maintaining cleanliness and safety.",
      },
      {
        id: "centrosome",
        name: "Centrosome",
        colorKey: "cyan",
        anchor: { x: 180, y: 220 },
        shape: {
          type: "path",
          d: "M 170 210 L 190 220 M 175 225 L 185 205",
          stroke: "#0891b2",
          strokeWidth: 4,
          strokeLinecap: "round",
          fill: "none",
        },
        function: "Serves as the main microtubule-organizing center (MTOC) that nucleates the mitotic spindle apparatus during cell division.",
        details:
          "Contains a pair of barrel-shaped centrioles positioned at right angles, each built from nine triplets of microtubules surrounded by pericentriolar matrix.",
        teachingTip:
          "Connect the centrosome to mitosis: without it, chromosomes cannot be segregated accurately into daughter cells.",
      },
    ],
  },

  // ==========================================
  // 4. PLANT PARTS & PHOTOSYNTHESIS
  // ==========================================
  {
    id: "plant-photosynthesis",
    title: "Plant Anatomy & Photosynthetic Machinery",
    area: "Biological systems",
    summary:
      "Vascular vegetative and reproductive plant anatomy connected to chloroplast thylakoids and microscopic stomatal gas regulation.",
    viewBox: { w: 600, h: 480 },
    discussionQuestions: [
      "How do guard cells use turgor pressure and potassium ion fluxes to open and close stomata in response to water stress?",
      "Trace the chemical reaction of photosynthesis: identify where light-dependent reactions and the Calvin cycle occur inside the chloroplast.",
      "How do xylem and phloem vascular bundles facilitate resource distribution between subterranean roots and aerial leaves?",
    ],
    decorations: [
      // Soil horizon divider line
      {
        type: "line",
        x1: 40,
        y1: 370,
        x2: 560,
        y2: 370,
        stroke: "#78350f",
        strokeWidth: 3,
        strokeDasharray: "6 3",
      },
      // Underground soil substrate tint
      {
        type: "rect",
        x: 40,
        y: 370,
        width: 520,
        height: 100,
        fill: "rgba(180, 83, 9, 0.08)",
      },
      // Sun & yellow solar rays
      {
        type: "circle",
        cx: 80,
        cy: 70,
        r: 28,
        fill: "#fde047",
        stroke: "#ca8a04",
        strokeWidth: 2.5,
      },
      {
        type: "path",
        d: "M 115 85 L 160 120 M 90 105 L 110 145 M 120 65 L 160 75",
        stroke: "#eab308",
        strokeWidth: 2,
        strokeDasharray: "3 3",
      },
      // CO2 in and O2 out chemical arrows
      {
        type: "path",
        d: "M 130 180 Q 150 190 160 210",
        stroke: "#0284c7",
        strokeWidth: 2,
        strokeDasharray: "3 2",
        fill: "none",
      },
      {
        type: "path",
        d: "M 200 230 Q 220 240 230 250",
        stroke: "#16a34a",
        strokeWidth: 2,
        strokeDasharray: "3 2",
        fill: "none",
      },
    ],
    parts: [
      {
        id: "roots",
        name: "Roots",
        colorKey: "amber",
        anchor: { x: 260, y: 420 },
        shape: {
          type: "path",
          d: "M 260 370 Q 250 410 220 440 M 260 370 Q 270 415 300 450 M 260 370 L 260 460",
          stroke: "#b45309",
          strokeWidth: 4,
          strokeLinecap: "round",
          fill: "none",
        },
        function: "Anchors the plant securely into the substratum and absorbs subterranean moisture and dissolved mineral ions.",
        details:
          "Root hairs dramatically amplify absorptive surface area; xylem vessels pull water upward driven by transpirational negative pressure.",
        teachingTip:
          "Have learners observe celery stalks in dyed water to trace vascular root-to-shoot capillary translocation.",
      },
      {
        id: "stem",
        name: "Stem",
        colorKey: "emerald",
        anchor: { x: 260, y: 290 },
        shape: {
          type: "rect",
          x: 252,
          y: 140,
          width: 16,
          height: 230,
          rx: 4,
          fill: "#4ade80",
          stroke: "#15803d",
          strokeWidth: 2.5,
        },
        function: "Provides biomechanical support for leaves, flowers, and fruits while channeling vascular fluids between roots and canopy.",
        details:
          "Contains vascular bundles of xylem (water/mineral transport upward) and phloem (sucrose and photosynthate transport in both directions).",
        teachingTip:
          "Use the mnemonic: 'Xylem up the sky-lem; Phloem flows to feed.'",
      },
      {
        id: "leaf",
        name: "Leaf",
        colorKey: "emerald",
        anchor: { x: 180, y: 220 },
        shape: {
          type: "path",
          d: "M 252 230 Q 180 200 150 220 Q 180 260 252 245 Z",
          fill: "#22c55e",
          stroke: "#166534",
          strokeWidth: 2.5,
        },
        function: "The principal photosynthetic organ capturing sunlight and ambient carbon dioxide to generate chemical sugars.",
        details:
          "Features a waxy waterproof cuticle, upper epidermis, palisade mesophyll packed with chloroplasts, and spongy mesophyll for gas circulation.",
        teachingTip:
          "Explain why broad, flat leaves capture maximal photons, whereas desert plants have needle-like leaves to curb transpiration.",
      },
      {
        id: "flower",
        name: "Flower",
        colorKey: "rose",
        anchor: { x: 260, y: 90 },
        shape: {
          type: "circle",
          cx: 260,
          cy: 90,
          r: 22,
          fill: "#f43f5e",
          stroke: "#be123c",
          strokeWidth: 2.5,
        },
        function: "The specialized angiosperm reproductive organ designed to facilitate pollination and genetic fertilization.",
        details:
          "Houses male stamens (anther and filament yielding pollen) and female carpels/pistils (stigma, style, and ovary holding ovules).",
        teachingTip:
          "Dissect a real hibiscus or lily flower in class so students can physically touch the sticky stigma and pollen-bearing anthers.",
      },
      {
        id: "fruit-seeds",
        name: "Fruit and Seeds",
        colorKey: "red",
        anchor: { x: 360, y: 180 },
        shape: {
          type: "circle",
          cx: 360,
          cy: 180,
          r: 20,
          fill: "#ef4444",
          stroke: "#991b1b",
          strokeWidth: 2.5,
        },
        function: "Protects maturing embryos and facilitates seed dispersal via animal ingestion, wind, water, or mechanical projection.",
        details:
          "Develops from the fertilized flower ovary. The pericarp (flesh) incentivizes herbivores to disperse seeds away from parent shade.",
        teachingTip:
          "Challenge learners to classify biological fruits vs. culinary vegetables (e.g., tomatoes and cucumbers are botanical fruits).",
      },
      {
        id: "stomata",
        name: "Stomata (zoomed inset)",
        colorKey: "teal",
        anchor: { x: 80, y: 360 },
        shape: {
          type: "circle",
          cx: 80,
          cy: 360,
          r: 28,
          fill: "#ccfbf1",
          stroke: "#0f766e",
          strokeWidth: 2.5,
        },
        function: "Microscopic leaf pores regulated by twin guard cells that govern carbon dioxide intake and water vapor loss.",
        details:
          "Turgid guard cells curve outward to open the stomatal aperture during daylight, but collapse shut under nocturnal or drought conditions.",
        teachingTip:
          "Tie stomatal opening to the critical evolutionary trade-off: acquiring CO2 requires inevitable water loss through transpiration.",
      },
      {
        id: "chloroplast",
        name: "Chloroplast (zoomed inset)",
        colorKey: "emerald",
        anchor: { x: 470, y: 340 },
        shape: {
          type: "ellipse",
          cx: 470,
          cy: 340,
          rx: 38,
          ry: 26,
          fill: "#86efac",
          stroke: "#15803d",
          strokeWidth: 2.5,
        },
        function: "The cellular photosynthetic organelle housing chlorophyll pigments, thylakoid discs, and stroma enzymes.",
        details:
          "Light reactions in thylakoid grana split H2O releasing O2 and synthesizing ATP/NADPH; the stroma Calvin cycle fixes CO2 into glucose.",
        teachingTip:
          "Write the net chemical equation: 6CO2 + 6H2O + light -> C6H12O6 + 6O2, showing exactly which reactant turns into which product.",
        funFact: "A single square millimeter of green leaf contains roughly half a million individual chloroplasts.",
      },
    ],
  },

  // ==========================================
  // 5. WATER CYCLE
  // ==========================================
  {
    id: "water-cycle",
    title: "Earth's Hydrologic Water Cycle",
    area: "Physical processes",
    summary:
      "The solar-powered thermodynamic cycle that continuously recirculates water through the hydrosphere, atmosphere, lithosphere, and biosphere.",
    viewBox: { w: 600, h: 480 },
    discussionQuestions: [
      "How does solar thermal irradiance drive phase changes from liquid water to atmospheric vapor, and what latent heat transfers occur?",
      "How do deforestation and extensive urban impervious paving disrupt natural infiltration rates and exacerbate flash runoff?",
      "Trace the residence time of water molecules: compare atmospheric vapor (days) with oceanic basins (thousands of years) and deep aquifers.",
    ],
    decorations: [
      // Mountain slope profile
      {
        type: "polygon",
        points: "40,430 180,180 300,320 380,240 440,380 40,430",
        fill: "var(--card-subtle, #f1f5f9)",
        stroke: "var(--border-subtle, #cbd5e1)",
        strokeWidth: 2,
      },
      // Ocean water body reservoir
      {
        type: "rect",
        x: 380,
        y: 380,
        width: 190,
        height: 70,
        fill: "#38bdf8",
        stroke: "#0284c7",
        strokeWidth: 2,
      },
      // Ascending evaporation vapor arrows
      {
        type: "path",
        d: "M 440 370 Q 450 310 460 270 M 480 370 Q 490 320 500 270",
        stroke: "#0284c7",
        strokeWidth: 2,
        strokeDasharray: "4 3",
        fill: "none",
      },
      // Transpiration rising vapor arrows from mountain foliage
      {
        type: "path",
        d: "M 120 260 Q 130 240 120 220",
        stroke: "#16a34a",
        strokeWidth: 2,
        strokeDasharray: "4 3",
        fill: "none",
      },
      // Rain precipitation droplets
      {
        type: "path",
        d: "M 240 220 L 230 260 M 270 220 L 260 260 M 300 220 L 290 260",
        stroke: "#0284c7",
        strokeWidth: 2.5,
        strokeDasharray: "5 4",
        fill: "none",
      },
      // Surface runoff river channel down slope
      {
        type: "path",
        d: "M 220 280 Q 250 330 380 400",
        stroke: "#0369a1",
        strokeWidth: 4,
        strokeLinecap: "round",
        fill: "none",
      },
    ],
    parts: [
      {
        id: "sun",
        name: "Sun",
        colorKey: "amber",
        anchor: { x: 90, y: 70 },
        shape: {
          type: "circle",
          cx: 90,
          cy: 70,
          r: 32,
          fill: "#fde047",
          stroke: "#eab308",
          strokeWidth: 3,
        },
        function: "The primary radiative energy powerhouse driving global thermal convection and water phase changes.",
        details:
          "Absorbed solar insolation warms surface waters, providing the latent heat of vaporization (~2,260 kJ/kg) required to convert liquid to gas.",
        teachingTip:
          "Ask students: 'If the Sun stopped shining, why would the entire water cycle grind to a halt within days?'",
      },
      {
        id: "ocean",
        name: "Ocean",
        colorKey: "blue",
        anchor: { x: 470, y: 420 },
        shape: {
          type: "rect",
          x: 400,
          y: 395,
          width: 150,
          height: 45,
          rx: 4,
          fill: "#0284c7",
          stroke: "#0369a1",
          strokeWidth: 2,
        },
        function: "The planetary reservoir containing roughly 97% of all Earth's water, supplying over 85% of evaporated atmospheric moisture.",
        details:
          "Thermal mass of oceans moderates planetary climate and regulates thermohaline circulation currents that transport heat across latitudes.",
        teachingTip:
          "Remind learners that when saltwater evaporates, mineral salts stay behind, leaving evaporated vapor as fresh water.",
      },
      {
        id: "evaporation",
        name: "Evaporation",
        colorKey: "cyan",
        anchor: { x: 460, y: 250 },
        shape: {
          type: "path",
          d: "M 450 290 Q 470 260 450 230 M 475 290 Q 495 260 475 230",
          stroke: "#06b6d4",
          strokeWidth: 4,
          strokeLinecap: "round",
          fill: "none",
        },
        function: "Phase transition converting surface liquid water into invisible gaseous atmospheric water vapor.",
        details:
          "Molecules with sufficient kinetic energy overcome hydrogen bonds and surface tension to enter the atmosphere as vapor.",
        teachingTip:
          "Connect evaporation to sweating: explain how evaporating liquid pulls thermal energy away from skin, producing cooling.",
      },
      {
        id: "condensation-cloud",
        name: "Condensation (Cloud)",
        colorKey: "sky",
        anchor: { x: 320, y: 90 },
        shape: {
          type: "path",
          d: "M 270 100 C 270 80 290 60 320 60 C 345 60 365 75 370 95 C 385 95 395 105 395 120 C 395 135 380 145 365 145 L 280 145 C 260 145 250 130 250 115 C 250 105 260 100 270 100 Z",
          fill: "#e0f2fe",
          stroke: "#38bdf8",
          strokeWidth: 2.5,
        },
        function: "Vapor cooling at higher altitudes condenses upon microscopic cloud condensation nuclei into liquid droplets or ice crystals.",
        details:
          "As humid air ascends adiabatically, it expands and cools to its dew point. Latent heat is released, warming the surrounding atmospheric parcel.",
        teachingTip:
          "Demonstrate condensation with an ice-filled metal cup: show that moisture outside the cup comes from air, not leaks through the metal.",
      },
      {
        id: "precipitation",
        name: "Precipitation",
        colorKey: "blue",
        anchor: { x: 260, y: 190 },
        shape: {
          type: "path",
          d: "M 255 170 L 245 210 M 275 170 L 265 210",
          stroke: "#2563eb",
          strokeWidth: 4,
          strokeLinecap: "round",
          fill: "none",
        },
        function: "Water released from clouds in the form of rain, freezing rain, sleet, snow, or hail.",
        details:
          "Occurs when condensed droplets coalesce until their mass overcomes updraft air resistance, falling under gravitational acceleration.",
        teachingTip:
          "Discuss different forms of precipitation in the Philippines (tropical typhoons, monsoon rains) vs. temperate climes (snow, sleet).",
      },
      {
        id: "runoff",
        name: "Runoff",
        colorKey: "blue",
        anchor: { x: 200, y: 320 },
        shape: {
          type: "path",
          d: "M 180 300 Q 210 330 240 340",
          stroke: "#1d4ed8",
          strokeWidth: 5,
          strokeLinecap: "round",
          fill: "none",
        },
        function: "Precipitation that flows gravitationally across Earth's surface into streams, rivers, lakes, and oceans.",
        details:
          "Occurs when rainfall intensity exceeds the infiltration capacity of soil, shaping geological terrain through erosion and sediment transport.",
        teachingTip:
          "Ask students how concrete city paving changes surface runoff volume compared to a natural forest watershed.",
      },
      {
        id: "infiltration-groundwater",
        name: "Infiltration (Groundwater)",
        colorKey: "amber",
        anchor: { x: 150, y: 430 },
        shape: {
          type: "path",
          d: "M 130 400 L 130 440 M 160 400 L 160 440 M 190 400 L 190 440",
          stroke: "#92400e",
          strokeWidth: 3,
          strokeDasharray: "4 3",
          fill: "none",
        },
        function: "Downwelling seepage of surface water through soil strata and permeable porous bedrock into underground aquifers.",
        details:
          "Groundwater moves slowly through aquifers under hydraulic gradients, feeding deep wells, natural springs, and baseflow of rivers.",
        teachingTip:
          "Use a glass jar filled with sand and gravel to show how water percolates downward to establish a water table.",
      },
      {
        id: "transpiration",
        name: "Transpiration",
        colorKey: "emerald",
        anchor: { x: 120, y: 220 },
        shape: {
          type: "path",
          d: "M 110 240 Q 130 210 115 190",
          stroke: "#16a34a",
          strokeWidth: 4,
          strokeLinecap: "round",
          fill: "none",
        },
        function: "Evaporative loss of water vapor from aerial vegetative tissues, predominantly through open foliar stomata.",
        details:
          "Creates negative hydrostatic pressure in leaf xylem that pulls water and minerals upward from roots across hundreds of vertical feet.",
        teachingTip:
          "Tie transpiration to rain forests: explain how the Amazon creates its own 'flying rivers' through collective evapotranspiration.",
      },
    ],
  },

  // ==========================================
  // 6. SIMPLE ELECTRIC CIRCUIT
  // ==========================================
  {
    id: "simple-electric-circuit",
    title: "Simple Direct Current (DC) Electric Circuit",
    area: "Physical processes",
    summary:
      "A closed electrical loop featuring a chemical EMF potential source, conductive paths, a control switch, and a resistive resistive light bulb load.",
    viewBox: { w: 600, h: 450 },
    supportsCircuitToggle: true,
    discussionQuestions: [
      "Explain the distinction between conventional current direction (positive to negative) and actual electron drift velocity (negative to positive).",
      "Using Ohm's Law (V = I * R), what happens to circuit current if wire resistance is negligible and the light bulb load is bypassed?",
      "Why does opening a single switch anywhere in a series circuit instantly extinguish every component in the loop?",
    ],
    decorations: [
      // Wire loop background path
      {
        type: "rect",
        x: 110,
        y: 80,
        width: 380,
        height: 290,
        rx: 16,
        fill: "none",
        stroke: "var(--border-subtle, #cbd5e1)",
        strokeWidth: 6,
      },
    ],
    parts: [
      {
        id: "battery-source",
        name: "Battery (Source)",
        colorKey: "amber",
        anchor: { x: 110, y: 225 },
        shape: [
          // Battery cylindrical casing
          {
            type: "rect",
            x: 85,
            y: 170,
            width: 50,
            height: 110,
            rx: 6,
            fill: "#334155",
            stroke: "#0f172a",
            strokeWidth: 2.5,
          },
          // Positive terminal nub (+)
          {
            type: "rect",
            x: 100,
            y: 155,
            width: 20,
            height: 15,
            rx: 3,
            fill: "#ef4444",
            stroke: "#991b1b",
            strokeWidth: 2,
          },
          // Polarity marks
          {
            type: "text",
            x: 110,
            y: 195,
            text: "+",
            fontSize: 20,
            fill: "#ef4444",
          },
          {
            type: "text",
            x: 110,
            y: 265,
            text: "-",
            fontSize: 22,
            fill: "#38bdf8",
          },
        ],
        function: "Converts chemical potential energy into electrical potential difference (voltage) to drive charge carrier flow.",
        details:
          "Maintains an electromotive force (EMF) between its positive anode and negative cathode via internal electrochemical redox reactions.",
        teachingTip:
          "Analogize voltage to water pressure from an elevated water tower: higher voltage exerts greater push on electrons.",
        funFact: "Alessandro Volta invented the first true battery, the voltaic pile, in 1800 using alternating zinc and copper discs.",
      },
      {
        id: "switch",
        name: "Switch",
        colorKey: "slate",
        anchor: { x: 300, y: 80 },
        shape: [
          // Contact terminals
          {
            type: "circle",
            cx: 275,
            cy: 80,
            r: 6,
            fill: "#475569",
            stroke: "#1e293b",
            strokeWidth: 2,
          },
          {
            type: "circle",
            cx: 325,
            cy: 80,
            r: 6,
            fill: "#475569",
            stroke: "#1e293b",
            strokeWidth: 2,
          },
        ],
        function: "Controls the continuity of the circuit by opening (interrupting) or closing (completing) the conductive pathway.",
        details:
          "When closed, conductive contacts bridge the air gap, establishing an unbroken circuit; when open, resistance approaches infinity, stopping current.",
        teachingTip:
          "Have learners toggle the switch button above the diagram to observe how opening the switch breaks current flow.",
        commonMisconception: "Students often think switches 'consume' electricity; emphasize that a switch is purely a mechanical gatekeeper.",
      },
      {
        id: "light-bulb-load",
        name: "Light Bulb (Load)",
        colorKey: "yellow",
        anchor: { x: 490, y: 225 },
        shape: [
          // Glass envelope
          {
            type: "circle",
            cx: 490,
            cy: 210,
            r: 32,
            fill: "#fef08a",
            stroke: "#ca8a04",
            strokeWidth: 2.5,
          },
          // Metal screw base
          {
            type: "rect",
            x: 478,
            y: 242,
            width: 24,
            height: 25,
            rx: 3,
            fill: "#94a3b8",
            stroke: "#475569",
            strokeWidth: 2,
          },
          // Tungsten filament loop
          {
            type: "path",
            d: "M 482 225 Q 490 195 498 225",
            stroke: "#eab308",
            strokeWidth: 2.5,
            strokeLinecap: "round",
            fill: "none",
          },
        ],
        function: "An electrical load that transforms electrical energy into thermal radiation and visible light via resistive incandescence.",
        details:
          "As high current forces its way through the narrow tungsten filament, high electrical resistance produces intense Joule heating (> 2500 °C).",
        teachingTip:
          "Highlight energy transformation: electrical energy -> thermal energy (heat) -> radiant energy (light).",
      },
      {
        id: "connecting-wires",
        name: "Connecting Wires",
        colorKey: "blue",
        anchor: { x: 300, y: 370 },
        shape: {
          type: "line",
          x1: 110,
          y1: 370,
          x2: 490,
          y2: 370,
          stroke: "#2563eb",
          strokeWidth: 6,
          strokeLinecap: "round",
        },
        function: "Low-resistance metallic conduits (typically copper) that provide an uninterrupted path for electron drift.",
        details:
          "Copper's crystalline metallic bonding features delocalized 'sea of electrons' that move freely under the influence of an applied electric field.",
        teachingTip:
          "Contrast conductors (copper, aluminum) with insulators (rubber sheath, plastic coating) that prevent dangerous short circuits.",
      },
      {
        id: "current-direction-flow",
        name: "Current Direction Flow",
        colorKey: "red",
        anchor: { x: 200, y: 80 },
        shape: {
          type: "path",
          d: "M 170 80 L 220 80 M 210 75 L 225 80 L 210 85",
          stroke: "#dc2626",
          strokeWidth: 3,
          strokeLinecap: "round",
          fill: "none",
        },
        function: "Indicates the direction of conventional current flow, defined by convention from positive (+) to negative (-).",
        details:
          "Established by Benjamin Franklin before electron discovery. In metallic conductors, physical electrons actually drift in the opposite direction (- to +).",
        teachingTip:
          "Clarify the historical paradox: conventional current (+) to (-) is used in circuit schematics, while physics teaches electron drift (-) to (+).",
      },
    ],
  },
];

