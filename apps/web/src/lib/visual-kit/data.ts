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
    imageSrc: "/visual-kit/heart.webp",
    imageAlt: "Internal cross-section anatomy of the human heart showing atria, ventricles, valves, and major vessels",
    aspectRatio: "10/7",
    attribution: {
      sourceTitle: "2008 Internal Anatomy of the Heart",
      author: "OpenStax College",
      sourceUrl: "https://commons.wikimedia.org/wiki/File:2008_Internal_Anatomy_of_the_HeartN.jpg",
      licenseName: "CC BY 3.0",
      licenseUrl: "https://creativecommons.org/licenses/by/3.0/",
      viaText: "Wikimedia Commons / OpenStax Anatomy and Physiology",
      notes: "Internal anatomical coronal section showing cardiac chambers and valve cusps",
    },
    coverBoxes: [
      // Top label
      { x: 24.5, y: 3.5, w: 9.5, h: 4.5, label: "Aorta" },
      // Left margin column
      { x: 0.2, y: 10.5, w: 22.0, h: 4.5, label: "Superior vena cava" },
      { x: 0.2, y: 16.5, w: 24.5, h: 4.5, label: "Right pulmonary artery" },
      { x: 0.2, y: 23.5, w: 18.5, h: 4.5, label: "Pulmonary trunk" },
      { x: 0.2, y: 29.5, w: 18.5, h: 7.5, label: "Right pulmonary veins" },
      { x: 0.2, y: 39.5, w: 14.5, h: 4.5, label: "Right atrium" },
      { x: 0.2, y: 45.0, w: 14.5, h: 4.5, label: "Fossa ovalis" },
      { x: 0.2, y: 50.0, w: 16.5, h: 4.5, label: "Tricuspid valve" },
      { x: 0.2, y: 55.5, w: 16.5, h: 4.5, label: "Right ventricle" },
      { x: 0.2, y: 61.0, w: 21.5, h: 4.5, label: "Chordae tendineae" },
      { x: 0.2, y: 67.0, w: 21.5, h: 4.5, label: "Trabeculae carneae" },
      { x: 0.2, y: 73.5, w: 18.0, h: 4.5, label: "Moderator band" },
      { x: 0.2, y: 79.5, w: 19.5, h: 4.5, label: "Inferior vena cava" },
      // Right margin column
      { x: 75.0, y: 10.5, w: 24.5, h: 4.5, label: "Left pulmonary artery" },
      { x: 75.0, y: 18.5, w: 13.5, h: 4.5, label: "Left atrium" },
      { x: 75.0, y: 25.5, w: 23.5, h: 4.5, label: "Left pulmonary veins" },
      { x: 75.0, y: 34.5, w: 24.5, h: 4.5, label: "Mitral (bicuspid) valve" },
      { x: 75.0, y: 42.5, w: 14.0, h: 4.5, label: "Aortic valve" },
      { x: 75.0, y: 48.0, w: 18.5, h: 4.8, label: "Pulmonary valve" },
      { x: 75.0, y: 54.0, w: 15.5, h: 4.5, label: "Left ventricle" },
      { x: 75.0, y: 59.5, w: 18.5, h: 4.5, label: "Papillary muscle" },
      { x: 75.0, y: 65.5, w: 24.5, h: 4.5, label: "Interventricular septum" },
      { x: 75.0, y: 70.0, w: 13.5, h: 4.2, label: "Epicardium" },
      { x: 75.0, y: 75.0, w: 15.0, h: 4.2, label: "Myocardium" },
      { x: 75.0, y: 80.0, w: 16.5, h: 4.5, label: "Endocardium" },
      // Bottom label
      { x: 40.5, y: 95.0, w: 19.0, h: 4.5, label: "Anterior view" },
    ],
    viewBox: { w: 600, h: 480 },
    discussionQuestions: [
      "Why is the muscular myocardium of the left ventricle significantly thicker than that of the right ventricle?",
      "Trace the path of an erythrocyte from the inferior vena cava until it exits through the aorta. Where does it pick up oxygen?",
      "How do the atrioventricular and semilunar valves prevent backflow, and what produces the characteristic 'lub-dub' heart sound?",
    ],
    decorations: [],
    parts: [
      {
        id: "superior-vena-cava",
        name: "Superior Vena Cava",
        colorKey: "blue",
        anchor: { x: 35.5, y: 15.0 },
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
        anchor: { x: 36.5, y: 75.5 },
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
        anchor: { x: 35.0, y: 38.0 },
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
        anchor: { x: 38.0, y: 53.0 },
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
        anchor: { x: 36.0, y: 64.0 },
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
        anchor: { x: 46.5, y: 40.5 },
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
        anchor: { x: 49.0, y: 26.0 },
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
        anchor: { x: 49.0, y: 11.5 },
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
        anchor: { x: 59.5, y: 32.5 },
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
        anchor: { x: 63.0, y: 41.5 },
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
        anchor: { x: 52.0, y: 44.0 },
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
        anchor: { x: 64.0, y: 58.0 },
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
        anchor: { x: 67.5, y: 28.0 },
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
    imageSrc: "/visual-kit/digestive-system.svg",
    imageAlt: "Anatomical illustration of the human digestive system from mouth to rectum",
    aspectRatio: "581/821",
    attribution: {
      sourceTitle: "Digestive system diagram",
      author: "Mariana Ruiz Villarreal (LadyofHats) and Jmarchn",
      sourceUrl: "https://commons.wikimedia.org/wiki/File:Digestive_system_diagram_en.svg",
      licenseName: "Public domain",
      licenseUrl: "https://creativecommons.org/publicdomain/zero/1.0/",
      viaText: "Wikimedia Commons",
      notes: "Anterior view of the human alimentary canal and accessory digestive organs",
    },
    viewBox: { w: 581, h: 821 },
    discussionQuestions: [
      "How do the structural adaptations of the small intestine (villi and microvilli) optimize nutrient absorption surface area?",
      "Why is hydrochloric acid in the stomach essential for pepsin activation, and what protects the gastric mucosa from autodigestion?",
      "Compare the functional roles of the liver, gallbladder, and pancreas as accessory digestive organs.",
    ],
    decorations: [],
    parts: [
      {
        id: "mouth",
        name: "Mouth",
        colorKey: "amber",
        anchor: { x: 46.5, y: 17.0 },
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
        anchor: { x: 52.0, y: 34.0 },
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
        anchor: { x: 64.0, y: 56.0 },
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
        anchor: { x: 37.5, y: 52.0 },
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
        anchor: { x: 42.0, y: 59.5 },
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
        anchor: { x: 51.0, y: 66.5 },
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
        anchor: { x: 50.0, y: 77.0 },
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
        anchor: { x: 37.0, y: 78.5 },
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
        anchor: { x: 53.0, y: 93.0 },
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
    imageSrc: "/visual-kit/animal-cell.svg",
    imageAlt: "Eukaryotic animal cell ultrastructure showing organelles and endomembrane system",
    aspectRatio: "724/484",
    attribution: {
      sourceTitle: "Animal cell structure",
      author: "Mariana Ruiz Villarreal (LadyofHats)",
      sourceUrl: "https://commons.wikimedia.org/wiki/File:Animal_cell_structure_en.svg",
      licenseName: "Public domain",
      licenseUrl: "https://creativecommons.org/publicdomain/zero/1.0/",
      viaText: "Wikimedia Commons",
      notes: "Cross-sectional diagram of eukaryotic animal cell anatomy and organelles",
    },
    viewBox: { w: 724, h: 484 },
    discussionQuestions: [
      "How does the endomembrane system (nucleus -> rough ER -> Golgi apparatus -> vesicles) coordinate protein synthesis and export?",
      "Why is the inner mitochondrial membrane deeply folded into cristae, and how does this relate to ATP synthase efficiency?",
      "Contrast the selective permeability of the cell membrane with organelle compartmentalization.",
    ],
    decorations: [],
    parts: [
      {
        id: "cell-membrane",
        name: "Cell Membrane",
        colorKey: "teal",
        anchor: { x: 12.0, y: 45.0 },
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
        anchor: { x: 22.0, y: 68.0 },
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
        anchor: { x: 45.0, y: 48.0 },
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
        anchor: { x: 38.0, y: 41.0 },
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
        anchor: { x: 76.0, y: 66.0 },
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
        anchor: { x: 50.0, y: 70.0 },
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
        anchor: { x: 67.0, y: 28.0 },
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
        anchor: { x: 72.0, y: 48.0 },
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
        anchor: { x: 32.0, y: 82.0 },
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
        anchor: { x: 26.0, y: 32.0 },
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
        anchor: { x: 55.0, y: 32.0 },
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
    aspectRatio: "5/4",
    attribution: {
      sourceTitle: "Plant Anatomy & Photosynthetic Machinery",
      author: "Original illustration by the CdM LMS team.",
      notes: "Botanical anatomy of flowering plants showing vegetative organs, reproductive structures, and cellular machinery",
    },
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
        x1: 30,
        y1: 340,
        x2: 570,
        y2: 340,
        stroke: "#78350f",
        strokeWidth: 3,
        strokeDasharray: "6 3",
      },
      // Underground soil substrate tint
      {
        type: "rect",
        x: 30,
        y: 340,
        width: 540,
        height: 130,
        fill: "rgba(120, 53, 15, 0.08)",
      },
      // Subtle soil particle pebble specks
      { type: "circle", cx: 210, cy: 370, r: 2.5, fill: "#92400e", opacity: 0.4 },
      { type: "circle", cx: 310, cy: 385, r: 2.5, fill: "#92400e", opacity: 0.4 },
      { type: "circle", cx: 240, cy: 420, r: 2, fill: "#92400e", opacity: 0.4 },
      { type: "circle", cx: 280, cy: 435, r: 2, fill: "#92400e", opacity: 0.4 },
      // Sun & yellow solar rays
      {
        type: "circle",
        cx: 75,
        cy: 65,
        r: 26,
        fill: "#fde047",
        stroke: "#ca8a04",
        strokeWidth: 2.5,
      },
      {
        type: "path",
        d: "M 108 78 L 155 105 M 85 98 L 105 142 M 105 50 L 150 45 M 55 98 L 40 135",
        stroke: "#eab308",
        strokeWidth: 2,
        strokeDasharray: "4 3",
      },
      // CO2 in and O2 out chemical arrows
      {
        type: "path",
        d: "M 125 180 Q 150 190 165 210",
        stroke: "#0284c7",
        strokeWidth: 2,
        strokeDasharray: "3 2",
        fill: "none",
      },
      {
        type: "path",
        d: "M 185 235 Q 210 250 220 265",
        stroke: "#16a34a",
        strokeWidth: 2,
        strokeDasharray: "3 2",
        fill: "none",
      },
      // Complementary right leaf (balancing shoot morphology)
      {
        type: "path",
        d: "M 264 210 Q 285 205 305 215",
        stroke: "#15803d",
        strokeWidth: 2.5,
        fill: "none",
      },
      {
        type: "path",
        d: "M 305 215 C 335 195 375 200 405 215 C 380 235 340 240 305 215 Z",
        fill: "#22c55e",
        stroke: "#166534",
        strokeWidth: 2,
      },
      {
        type: "path",
        d: "M 305 215 Q 355 212 405 215",
        stroke: "#86efac",
        strokeWidth: 1.5,
        fill: "none",
      },
      {
        type: "path",
        d: "M 330 214 Q 340 205 350 203 M 330 214 Q 340 223 350 225 M 360 214 Q 370 207 380 206 M 360 214 Q 370 221 380 222",
        stroke: "#86efac",
        strokeWidth: 1.2,
        fill: "none",
      },
      // Stomata inset dashed connector to leaf blade
      {
        type: "path",
        d: "M 100 345 Q 120 280 155 235",
        stroke: "#0d9488",
        strokeWidth: 1.5,
        strokeDasharray: "3 3",
        fill: "none",
      },
      // Chloroplast inset dashed connector to leaf blade
      {
        type: "path",
        d: "M 480 345 Q 400 290 355 225",
        stroke: "#059669",
        strokeWidth: 1.5,
        strokeDasharray: "3 3",
        fill: "none",
      },
    ],
    parts: [
      {
        id: "roots",
        name: "Roots (Taproot System)",
        colorKey: "amber",
        anchor: { x: 43.3, y: 84.0 },
        shape: [
          // Primary taproot tapering down into soil
          {
            type: "path",
            d: "M 256 340 Q 258 390 260 450 Q 262 390 264 340 Z",
            fill: "#92400e",
            stroke: "#78350f",
            strokeWidth: 2,
          },
          // Root cap at apex
          {
            type: "circle",
            cx: 260,
            cy: 451,
            r: 3.5,
            fill: "#78350f",
          },
          // Lateral root branches (upper tier)
          {
            type: "path",
            d: "M 257 360 Q 225 375 195 390",
            stroke: "#b45309",
            strokeWidth: 3,
            strokeLinecap: "round",
            fill: "none",
          },
          {
            type: "path",
            d: "M 263 365 Q 295 378 325 392",
            stroke: "#b45309",
            strokeWidth: 3,
            strokeLinecap: "round",
            fill: "none",
          },
          // Lateral root branches (middle tier)
          {
            type: "path",
            d: "M 258 390 Q 230 408 210 430",
            stroke: "#b45309",
            strokeWidth: 2.5,
            strokeLinecap: "round",
            fill: "none",
          },
          {
            type: "path",
            d: "M 262 395 Q 290 412 315 432",
            stroke: "#b45309",
            strokeWidth: 2.5,
            strokeLinecap: "round",
            fill: "none",
          },
          // Fine tertiary rootlet hairs
          {
            type: "path",
            d: "M 215 382 L 205 380 M 235 372 L 230 365 M 305 384 L 315 380 M 280 373 L 285 365 M 225 418 L 215 422 M 300 422 L 310 425",
            stroke: "#d97706",
            strokeWidth: 1.5,
            strokeLinecap: "round",
            fill: "none",
          },
        ],
        function:
          "Anchors the plant securely into the subterranean soil substratum and absorbs subterranean moisture and dissolved mineral ions.",
        details:
          "Features a prominent central taproot that penetrates deep into the soil and branching lateral roots equipped with microscopic root hairs to maximize water uptake.",
        teachingTip:
          "Have learners contrast a dicot taproot (e.g. carrot or dandelion) with fibrous monocot grass roots to illustrate structural adaptations.",
      },
      {
        id: "stem",
        name: "Stem",
        colorKey: "emerald",
        anchor: { x: 43.3, y: 55.0 },
        shape: [
          // Main vascular stalk
          {
            type: "rect",
            x: 255,
            y: 118,
            width: 10,
            height: 222,
            rx: 4,
            fill: "#4ade80",
            stroke: "#15803d",
            strokeWidth: 2.5,
          },
          // Nodes
          {
            type: "line",
            x1: 253,
            y1: 232,
            x2: 267,
            y2: 232,
            stroke: "#166534",
            strokeWidth: 2.5,
          },
          {
            type: "line",
            x1: 253,
            y1: 175,
            x2: 267,
            y2: 175,
            stroke: "#166534",
            strokeWidth: 2.5,
          },
        ],
        function:
          "Provides biomechanical support for leaves, flowers, and fruits while channeling vascular fluids between subterranean roots and the aerial shoot canopy.",
        details:
          "Contains specialized vascular bundles of xylem (conducting water and minerals upward) and phloem (translocating sucrose and photosynthates throughout the plant body).",
        teachingTip:
          "Use the mnemonic: 'Xylem up the sky-lem; Phloem flows to feed.'",
      },
      {
        id: "leaf",
        name: "Leaf (Petiole & Veined Lamina)",
        colorKey: "emerald",
        anchor: { x: 28.5, y: 46.0 },
        shape: [
          // Petiole attaching leaf blade to stem node
          {
            type: "path",
            d: "M 255 232 Q 235 234 218 225",
            stroke: "#15803d",
            strokeWidth: 3,
            strokeLinecap: "round",
            fill: "none",
          },
          // Leaf blade (lamina)
          {
            type: "path",
            d: "M 218 225 C 185 198 142 198 115 215 C 142 238 185 248 218 225 Z",
            fill: "#16a34a",
            stroke: "#14532d",
            strokeWidth: 2.5,
          },
          // Midrib central primary vein
          {
            type: "path",
            d: "M 218 225 Q 168 218 115 215",
            stroke: "#86efac",
            strokeWidth: 2,
            fill: "none",
          },
          // Branching lateral secondary veins
          {
            type: "path",
            d: "M 192 222 Q 182 208 170 205 M 192 222 Q 182 234 170 238 M 160 219 Q 150 208 140 207 M 160 219 Q 150 228 140 230 M 135 217 Q 128 210 122 210 M 135 217 Q 128 222 122 223",
            stroke: "#86efac",
            strokeWidth: 1.5,
            strokeLinecap: "round",
            fill: "none",
          },
        ],
        function:
          "The principal photosynthetic organ capturing sunlight and atmospheric carbon dioxide through open stomata to generate chemical sugars.",
        details:
          "Features a flexible petiole attaching to the stem node, an expanded photosynthetic lamina (blade), and an intricate vascular network of branching veins.",
        teachingTip:
          "Explain how leaf venation distributes xylem water directly to mesophyll cells while gathering photosynthesized glucose into the phloem.",
      },
      {
        id: "flower",
        name: "Flower (Petals, Stamen & Pistil)",
        colorKey: "rose",
        anchor: { x: 43.3, y: 17.5 },
        shape: [
          // Calyx / sepals
          {
            type: "path",
            d: "M 252 118 Q 242 126 238 136 M 268 118 Q 278 126 282 136 M 260 120 L 260 132",
            stroke: "#15803d",
            strokeWidth: 2.5,
            strokeLinecap: "round",
            fill: "none",
          },
          // 5 Petals (radiating corolla)
          {
            type: "path",
            d: "M 252 85 C 248 54 272 54 268 85 Z",
            fill: "#f43f5e",
            stroke: "#be123c",
            strokeWidth: 2,
          },
          {
            type: "path",
            d: "M 252 80 C 224 64 238 42 256 74 Z",
            fill: "#fb7185",
            stroke: "#be123c",
            strokeWidth: 2,
          },
          {
            type: "path",
            d: "M 268 80 C 296 64 282 42 264 74 Z",
            fill: "#fb7185",
            stroke: "#be123c",
            strokeWidth: 2,
          },
          {
            type: "path",
            d: "M 250 88 C 222 102 234 122 255 96 Z",
            fill: "#f43f5e",
            stroke: "#be123c",
            strokeWidth: 2,
          },
          {
            type: "path",
            d: "M 270 88 C 298 102 286 122 265 96 Z",
            fill: "#f43f5e",
            stroke: "#be123c",
            strokeWidth: 2,
          },
          // Stamens (filaments + anthers with pollen)
          {
            type: "line",
            x1: 256,
            y1: 86,
            x2: 246,
            y2: 68,
            stroke: "#fef08a",
            strokeWidth: 1.5,
          },
          {
            type: "ellipse",
            cx: 245,
            cy: 67,
            rx: 3.5,
            ry: 2.2,
            fill: "#eab308",
            stroke: "#a16207",
            strokeWidth: 1,
          },
          {
            type: "line",
            x1: 264,
            y1: 86,
            x2: 274,
            y2: 68,
            stroke: "#fef08a",
            strokeWidth: 1.5,
          },
          {
            type: "ellipse",
            cx: 275,
            cy: 67,
            rx: 3.5,
            ry: 2.2,
            fill: "#eab308",
            stroke: "#a16207",
            strokeWidth: 1,
          },
          // Pistil / Carpel (female reproductive organs)
          {
            type: "circle",
            cx: 260,
            cy: 88,
            r: 8,
            fill: "#bef264",
            stroke: "#65a30d",
            strokeWidth: 1.5,
          },
          {
            type: "line",
            x1: 260,
            y1: 81,
            x2: 260,
            y2: 66,
            stroke: "#84cc16",
            strokeWidth: 2.5,
          },
          {
            type: "circle",
            cx: 260,
            cy: 65,
            r: 3.5,
            fill: "#a3e635",
            stroke: "#4d7c0f",
            strokeWidth: 1.5,
          },
        ],
        function:
          "The specialized angiosperm reproductive organ designed to produce gametes, attract animal pollinators, and facilitate genetic fertilization.",
        details:
          "Composed of protective green sepals (calyx), radiant petals (corolla), male stamens (pollen-producing anthers and filaments), and female carpels/pistils (stigma, style, and ovary holding ovules).",
        teachingTip:
          "Dissect a real flower in the science lab so students can observe pollen transfer from the powdery anther to the sticky surface of the stigma.",
      },
      {
        id: "fruit-seeds",
        name: "Fruit and Seeds",
        colorKey: "red",
        anchor: { x: 56.0, y: 41.5 },
        shape: [
          // Pedicel fruiting stalk
          {
            type: "path",
            d: "M 265 176 Q 295 172 318 190",
            stroke: "#15803d",
            strokeWidth: 2.5,
            strokeLinecap: "round",
            fill: "none",
          },
          // Outer pericarp fruit wall
          {
            type: "circle",
            cx: 336,
            cy: 199,
            r: 21,
            fill: "#dc2626",
            stroke: "#991b1b",
            strokeWidth: 2,
          },
          // Fleshy mesocarp/endocarp cross section
          {
            type: "circle",
            cx: 336,
            cy: 199,
            r: 16,
            fill: "#f87171",
          },
          // Internal seeds
          {
            type: "ellipse",
            cx: 331,
            cy: 195,
            rx: 3,
            ry: 4,
            fill: "#78350f",
          },
          {
            type: "ellipse",
            cx: 341,
            cy: 195,
            rx: 3,
            ry: 4,
            fill: "#78350f",
          },
          {
            type: "ellipse",
            cx: 336,
            cy: 206,
            rx: 4,
            ry: 3,
            fill: "#78350f",
          },
        ],
        function:
          "Protects maturing plant embryos within protective pericarps and facilitates seed dispersal via wind, water, or animal ingestion.",
        details:
          "Develops from the fertilized floral ovary. Mature seeds house the protective seed coat, nutrient-rich endosperm, and embryonic radicle and plumule.",
        teachingTip:
          "Challenge students to classify biological fruits vs. culinary vegetables (e.g., peppers, cucumbers, and tomatoes are botanical fruits harboring seeds).",
      },
      {
        id: "stomata",
        name: "Stomata (zoomed inset)",
        colorKey: "teal",
        anchor: { x: 16.5, y: 79.2 },
        shape: [
          // Lens frame boundary
          {
            type: "circle",
            cx: 99,
            cy: 380,
            r: 36,
            fill: "#f0fdfa",
            stroke: "#0d9488",
            strokeWidth: 2.5,
          },
          // Left guard cell
          {
            type: "path",
            d: "M 97 356 C 83 366 83 394 97 404 C 90 394 90 366 97 356 Z",
            fill: "#2dd4bf",
            stroke: "#0f766e",
            strokeWidth: 2,
          },
          // Right guard cell
          {
            type: "path",
            d: "M 101 356 C 115 366 115 394 101 404 C 108 394 108 366 101 356 Z",
            fill: "#2dd4bf",
            stroke: "#0f766e",
            strokeWidth: 2,
          },
          // Stomatal aperture / pore
          {
            type: "ellipse",
            cx: 99,
            cy: 380,
            rx: 2.5,
            ry: 9,
            fill: "#134e4a",
          },
          // Chloroplast organelles inside guard cells
          { type: "circle", cx: 89, cy: 374, r: 2, fill: "#047857" },
          { type: "circle", cx: 89, cy: 386, r: 2, fill: "#047857" },
          { type: "circle", cx: 109, cy: 374, r: 2, fill: "#047857" },
          { type: "circle", cx: 109, cy: 386, r: 2, fill: "#047857" },
        ],
        function:
          "Microscopic epidermal leaf pores regulated by twin turgid guard cells that govern atmospheric carbon dioxide intake and transpirational water vapor loss.",
        details:
          "Osmotic potassium ion influx drives water into guard cells, causing them to bow outward and dilate the central aperture during daylight photosynthetic hours.",
        teachingTip:
          "Tie stomatal opening to the critical plant evolutionary trade-off: capturing carbon dioxide inevitably costs water vapor through transpiration.",
      },
      {
        id: "chloroplast",
        name: "Chloroplast (zoomed inset)",
        colorKey: "emerald",
        anchor: { x: 81.5, y: 79.2 },
        shape: [
          // Outer double-membrane envelope
          {
            type: "ellipse",
            cx: 489,
            cy: 380,
            rx: 48,
            ry: 32,
            fill: "#ecfdf5",
            stroke: "#059669",
            strokeWidth: 2.5,
          },
          // Inner membrane wall
          {
            type: "ellipse",
            cx: 489,
            cy: 380,
            rx: 42,
            ry: 27,
            fill: "#d1fae5",
            stroke: "#10b981",
            strokeWidth: 1.5,
          },
          // Thylakoid grana stacks
          { type: "rect", x: 462, y: 368, width: 13, height: 4, rx: 1, fill: "#047857" },
          { type: "rect", x: 462, y: 374, width: 13, height: 4, rx: 1, fill: "#047857" },
          { type: "rect", x: 462, y: 380, width: 13, height: 4, rx: 1, fill: "#047857" },
          { type: "rect", x: 483, y: 366, width: 13, height: 4, rx: 1, fill: "#047857" },
          { type: "rect", x: 483, y: 372, width: 13, height: 4, rx: 1, fill: "#047857" },
          { type: "rect", x: 483, y: 378, width: 13, height: 4, rx: 1, fill: "#047857" },
          { type: "rect", x: 504, y: 370, width: 13, height: 4, rx: 1, fill: "#047857" },
          { type: "rect", x: 504, y: 376, width: 13, height: 4, rx: 1, fill: "#047857" },
          { type: "rect", x: 504, y: 382, width: 13, height: 4, rx: 1, fill: "#047857" },
          // Interconnecting stroma lamellae
          {
            type: "line",
            x1: 468,
            y1: 374,
            x2: 511,
            y2: 374,
            stroke: "#059669",
            strokeWidth: 1.5,
          },
        ],
        function:
          "The double-membrane metabolic organelle housing light-harvesting chlorophyll complexes, thylakoid grana discs, and stroma enzymes.",
        details:
          "Photochemical light reactions in thylakoid membrane grana split water and generate ATP/NADPH, while the stroma Calvin cycle fixes carbon dioxide into carbohydrates.",
        teachingTip:
          "Write out the net chemical equation: 6CO2 + 6H2O + light -> C6H12O6 + 6O2, showing exactly which cellular compartment executes each step.",
        funFact:
          "A single square millimeter of green leaf contains roughly half a million individual chloroplasts.",
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
    imageSrc: "/visual-kit/water-cycle.webp",
    imageAlt: "USGS official diagram illustrating the natural global water cycle and phase changes",
    aspectRatio: "960/657",
    attribution: {
      sourceTitle: "The Water Cycle (USGS)",
      author: "Hayley Corson-Dosch, Cee Nell, Rachel Volentine, et al. (USGS)",
      sourceUrl: "https://commons.wikimedia.org/wiki/File:USGS_WaterCycle_English_ONLINE_20221013.png",
      licenseName: "Public domain",
      licenseUrl: "https://www.usgs.gov/information-policies-and-instructions/copyrights-and-credits",
      viaText: "U.S. Geological Survey (USGS)",
      notes: "USGS educational public-domain diagram showing global water pathways and storage reservoirs",
    },
    coverBoxes: [
      // Bottom explanatory paragraphs banner
      { x: 0.5, y: 78.0, w: 99.0, h: 21.5, label: "Bottom narrative and definitions" },
      // Top-right pools and fluxes legend card + logo
      { x: 76.5, y: 3.0, w: 22.5, h: 16.0, label: "Pools and Fluxes legend box" },
      { x: 92.0, y: 19.0, w: 7.2, h: 3.8, label: "USGS logo" },
      // Upper atmosphere & precipitation
      { x: 1.0, y: 5.2, w: 12.5, h: 4.8, label: "Atmospheric moisture over ocean" },
      { x: 4.0, y: 15.8, w: 13.0, h: 4.2, label: "Transport of moisture" },
      { x: 1.0, y: 28.2, w: 8.0, h: 4.8, label: "Precipitation over ocean" },
      { x: 15.2, y: 18.8, w: 12.2, h: 4.2, label: "Precipitation over land (left)" },
      { x: 60.5, y: 11.8, w: 12.5, h: 4.2, label: "Precipitation over land (right)" },
      { x: 39.0, y: 8.8, w: 14.0, h: 4.5, label: "Atmospheric moisture over land" },
      // Mountain snow, ice and evapotranspiration
      { x: 37.0, y: 22.2, w: 11.5, h: 3.8, label: "Evapotranspiration (center)" },
      { x: 60.5, y: 31.8, w: 12.0, h: 3.8, label: "Evapotranspiration (right)" },
      { x: 49.0, y: 19.8, w: 9.5, h: 5.0, label: "Ice sheets and glaciers" },
      { x: 59.0, y: 19.8, w: 7.5, h: 3.8, label: "Snowpack" },
      { x: 65.0, y: 20.8, w: 7.2, h: 3.8, label: "Snowmelt" },
      { x: 88.0, y: 24.8, w: 8.5, h: 3.8, label: "Permafrost" },
      { x: 81.0, y: 30.2, w: 9.5, h: 4.5, label: "Groundwater recharge" },
      { x: 72.0, y: 26.2, w: 7.8, h: 3.8, label: "Reservoirs" },
      // Mid-elevation terrain, lakes, wetlands, and human use
      { x: 20.0, y: 30.2, w: 6.5, h: 3.8, label: "Runoff" },
      { x: 26.5, y: 24.8, w: 9.5, h: 4.8, label: "Streamflow to closed basins" },
      { x: 34.0, y: 25.2, w: 5.5, h: 4.5, label: "Lakes saline" },
      { x: 24.5, y: 38.2, w: 5.5, h: 4.5, label: "Lakes fresh" },
      { x: 40.0, y: 34.5, w: 6.8, h: 4.5, label: "Wetlands fresh" },
      { x: 12.5, y: 44.5, w: 7.2, h: 4.2, label: "Wetlands brackish" },
      { x: 26.0, y: 41.5, w: 5.0, h: 2.8, label: "Domestic water use" },
      { x: 52.5, y: 40.8, w: 7.5, h: 4.5, label: "Grazing water use" },
      { x: 63.0, y: 45.8, w: 9.0, h: 4.5, label: "Agricultural water use" },
      { x: 33.0, y: 44.2, w: 6.0, h: 4.0, label: "Rivers" },
      { x: 26.5, y: 47.5, w: 6.8, h: 4.0, label: "Urban runoff" },
      { x: 31.0, y: 50.2, w: 8.0, h: 4.5, label: "Municipal water use" },
      { x: 43.0, y: 51.8, w: 7.5, h: 4.5, label: "Industrial water use" },
      { x: 33.5, y: 56.0, w: 8.0, h: 4.5, label: "Streamflow to ocean" },
      // Ocean, groundwater and subsurface
      { x: 0.8, y: 49.0, w: 8.5, h: 4.5, label: "Ocean evaporation" },
      { x: 9.5, y: 54.0, w: 7.5, h: 4.2, label: "Ocean circulation" },
      { x: 9.0, y: 61.0, w: 7.5, h: 4.2, label: "Ocean mixed zone" },
      { x: 3.5, y: 69.5, w: 9.5, h: 4.5, label: "Ocean deep water zone" },
      { x: 16.5, y: 71.0, w: 12.0, h: 4.5, label: "Groundwater discharge to ocean" },
      { x: 55.5, y: 57.0, w: 8.8, h: 4.0, label: "Soil moisture" },
      { x: 44.5, y: 60.5, w: 9.0, h: 4.0, label: "Groundwater (subsurface flow)" },
      { x: 77.5, y: 55.5, w: 7.2, h: 3.2, label: "Groundwater (bedrock)" },
      { x: 74.5, y: 70.0, w: 4.5, h: 5.5, label: "General overview schematic box" },
    ],
    viewBox: { w: 600, h: 480 },
    discussionQuestions: [
      "How does solar thermal irradiance drive phase changes from liquid water to atmospheric vapor, and what latent heat transfers occur?",
      "How do deforestation and extensive urban impervious paving disrupt natural infiltration rates and exacerbate flash runoff?",
      "Trace the residence time of water molecules: compare atmospheric vapor (days) with oceanic basins (thousands of years) and deep aquifers.",
    ],
    decorations: [],
    parts: [
      {
        id: "sun",
        name: "Sun",
        colorKey: "amber",
        anchor: { x: 15.0, y: 11.0 },
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
        anchor: { x: 8.0, y: 64.0 },
        function: "The planetary reservoir containing roughly 97% of all Earth's water, supplying over 85% of evaporated atmospheric moisture.",
        details:
          "Thermal mass of oceans moderates planetary climate and regulates thermohaline circulation currents that transport heat across latitudes.",
        teachingTip:
          "Remind learners that when saltwater evaporates, mineral salts stay behind, leaving evaporated vapor as fresh fresh water.",
      },
      {
        id: "evaporation",
        name: "Evaporation",
        colorKey: "cyan",
        anchor: { x: 5.0, y: 44.0 },
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
        anchor: { x: 53.0, y: 11.0 },
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
        anchor: { x: 21.0, y: 24.0 },
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
        anchor: { x: 35.0, y: 48.0 },
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
        anchor: { x: 84.0, y: 62.0 },
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
        anchor: { x: 44.0, y: 32.0 },
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
      "A closed electrical loop featuring a chemical EMF potential source, conductive paths, a control switch, and a resistive light bulb load.",
    aspectRatio: "4/3",
    attribution: {
      sourceTitle: "Simple Direct Current (DC) Electric Circuit",
      author: "Original illustration by the CdM LMS team.",
      notes: "Interactive circuit schematic with switch controls, incandescence glow, and electron flow simulation",
    },
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
        anchor: { x: 18.3, y: 50.0 },
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
        anchor: { x: 50.0, y: 17.8 },
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
        anchor: { x: 81.7, y: 50.0 },
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
        anchor: { x: 50.0, y: 82.2 },
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
        anchor: { x: 33.3, y: 17.8 },
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
