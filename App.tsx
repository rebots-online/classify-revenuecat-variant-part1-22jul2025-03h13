/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
/* tslint:disable */

import ContentContainer from '@/components/ContentContainer';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import LlmLogPanel from '@/components/LlmLogPanel';
import HowToUseModal from '@/components/HowToUseModal';
import CostIndicator from '@/components/CostIndicator';
import PurchaseCreditsModal from '@/components/PurchaseCreditsModal';
import OnboardingWalletModal from '@/components/OnboardingWalletModal';
import { requestProvider } from 'webln';

import {DataContext} from '@/context';
import {TextGenerationInteraction} from '@/lib/textGeneration';
import {
  getYoutubeEmbedUrl,
  validateYoutubeUrl,
  getYouTubeVideoId,
} from '@/lib/youtube';
import {useContext, useEffect, useRef, useState, useCallback} from 'react'; 
import { v4 as uuidv4 } from 'uuid';

const VALIDATE_INPUT_URL = true;

export interface AppConfig {
  revenueCat?: {
    enabled: boolean;
  };
  lnPubKey?: string;
  menuLinks: { name: string; href: string }[];
}

export interface ContentBasis {
  videoUrl?: string;
  topicOrDetails?: string;
  complexity: number;
}

export interface LlmInteraction {
  id: string;
  timestamp: string;
  type: 'PROMPT' | 'RESPONSE' | 'ERROR';
  model?: string;
  data: any;
}

export interface EducationalMaterialRequest {
  lessonPlan: boolean;
  handout: boolean;
  quiz: boolean;
}

type CostLevel = 'Low' | 'Medium' | 'High';

const YOUTUBE_URL_REGEX = /(https?:\/\/(?:www\.)?(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)[\w\-]+)/i;
const COST_MAP_CREDITS: Record<CostLevel, number> = { 'Low': 15, 'Medium': 40, 'High': 75 };
const MATERIAL_COST_CREDITS: Record<CostLevel, number> = { 'Low': 10, 'Medium': 25, 'High': 25 }; // High isn't used for materials


export default function App() {
  const {} = useContext(DataContext); 

  const [appConfig, setAppConfig] = useState<AppConfig | null>(null);
  const [contentBasis, setContentBasis] = useState<ContentBasis | null>(null);
  const [inputProcessing, setInputProcessing] = useState(false);
  const [contentLoading, setContentLoading] = useState(false);
  const [isOutputExpanded, setIsOutputExpanded] = useState(false); 
  const [estimatedCost, setEstimatedCost] = useState<CostLevel>('Medium');
  const [complexity, setComplexity] = useState(2);
  const complexityLabels = ['Simple', 'Standard', 'Detailed'];

  const [lessonPlanCost, setLessonPlanCost] = useState<CostLevel>('Low');
  const [handoutCost, setHandoutCost] = useState<CostLevel>('Low');
  const [quizCost, setQuizCost] = useState<CostLevel>('Low');

  // Credit system state
  const [userCredits, setUserCredits] = useState<number>(0);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [showOnboardingModal, setShowOnboardingModal] = useState(false);
  const [loggedInUser, setLoggedInUser] = useState<string | null>(null);


  const contentContainerRef = useRef<{ getSpec: () => string; getCode: () => string; } | null>(null);
  const [reloadCounter, setReloadCounter] = useState(0);
  const contentInputRef = useRef<HTMLTextAreaElement>(null);

  const [llmInteractions, setLlmInteractions] = useState<LlmInteraction[]>([]);
  const [showLlmLogPanel, setShowLlmLogPanel] = useState(true); 
  const [showHowToUseModal, setShowHowToUseModal] = useState(false); 

  const [requestedMaterials, setRequestedMaterials] = useState<EducationalMaterialRequest>({
    lessonPlan: false,
    handout: false,
    quiz: false,
  });

  // Load config
  useEffect(() => {
    fetch('/config.json')
      .then(res => res.json())
      .then(config => setAppConfig(config))
      .catch(err => console.error("Failed to load config.json:", err));
  }, []);

  // Helper to get the correct localStorage key for credits
  const getCreditStorageKey = useCallback((pubkey: string | null) => {
    return pubkey ? `userCredits-${pubkey}` : 'anonymousUserCredits';
  }, []);

  // Load user and credits on startup
  useEffect(() => {
    const savedPubKey = localStorage.getItem('loggedInUserPubKey');
    if (savedPubKey) {
      setLoggedInUser(savedPubKey);
      const savedCredits = localStorage.getItem(getCreditStorageKey(savedPubKey));
      setUserCredits(savedCredits ? parseInt(savedCredits, 10) : 200);
    } else {
      const savedCredits = localStorage.getItem(getCreditStorageKey(null));
      setUserCredits(savedCredits ? parseInt(savedCredits, 10) : 200);
    }
  }, [getCreditStorageKey]);

  // Persist credits when they change for the current user (logged in or anonymous)
  useEffect(() => {
    // For a real platform, this would be a backend update.
    // Avoid saving the initial 0 state for anonymous users on first load.
    if (loggedInUser || userCredits !== 0) {
      const key = getCreditStorageKey(loggedInUser);
      localStorage.setItem(key, String(userCredits));
    }
  }, [userCredits, loggedInUser, getCreditStorageKey]);


  const updateCosts = useCallback((hasUrl: boolean, complexityLevel: number) => {
    if (hasUrl) {
      setEstimatedCost(complexityLevel > 1 ? 'High' : 'Medium');
    } else {
      setEstimatedCost(complexityLevel > 2 ? 'High' : 'Medium');
    }
    const materialCost = complexityLevel > 2 ? 'Medium' : 'Low';
    setLessonPlanCost(materialCost);
    setHandoutCost(materialCost);
    setQuizCost(materialCost);
  }, []);

  useEffect(() => {
    const hasUrl = contentInputRef.current?.value.match(YOUTUBE_URL_REGEX) !== null;
    updateCosts(hasUrl, complexity);
  }, [complexity, updateCosts, contentInputRef.current?.value]);

  const handleLlmInteraction = useCallback((interaction: TextGenerationInteraction) => {
    setLlmInteractions((prevInteractions) => [
      ...prevInteractions,
      { id: uuidv4(), timestamp: new Date().toISOString(), type: interaction.type, model: interaction.modelName, data: interaction.data },
    ]);
  }, []); 

  const handleToggleLlmLogPanel = () => setShowLlmLogPanel(prev => !prev);
  const handleClearLlmLog = () => setLlmInteractions([]);
  const toggleHowToUseModal = () => setShowHowToUseModal(prev => !prev);
  const handleToggleExpandOutput = () => setIsOutputExpanded(prev => !prev);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !isFormDisabled) {
      e.preventDefault();
      handleSubmit();
    }
  };
  
  const proceedWithContent = (url?: string, topic?: string) => {
    setContentBasis({ videoUrl: url, topicOrDetails: topic, complexity });
    setReloadCounter((c) => c + 1);
    setInputProcessing(false);
  };

  const startContentGeneration = async () => {
    const inputValue = contentInputRef.current?.value.trim() || '';
    if (!inputValue) {
      contentInputRef.current?.focus();
      return;
    }

    setInputProcessing(true);
    setContentBasis(null);

    const urlMatch = inputValue.match(YOUTUBE_URL_REGEX);
    let videoUrlToProcess: string | undefined = undefined;
    let topicOrDetailsToProcess: string | undefined = inputValue;

    if (urlMatch?.[0]) {
      const potentialUrl = urlMatch[0];
      if (getYouTubeVideoId(potentialUrl)) {
        videoUrlToProcess = potentialUrl;
        topicOrDetailsToProcess = inputValue.replace(potentialUrl, '').trim() || undefined;
      }
    }
    
    if (videoUrlToProcess && VALIDATE_INPUT_URL) {
      const validationResult = await validateYoutubeUrl(videoUrlToProcess);
      if (validationResult.isValid) {
        proceedWithContent(videoUrlToProcess, topicOrDetailsToProcess);
      } else {
        alert(validationResult.error || 'Invalid YouTube URL detected.');
        setInputProcessing(false);
        contentInputRef.current?.focus();
      }
    } else {
      proceedWithContent(videoUrlToProcess, topicOrDetailsToProcess);
    }
  };

  const handlePurchaseCredits = (amount: number) => {
    setUserCredits(prev => prev + amount);
    setShowPurchaseModal(false);
    alert(`${amount.toLocaleString()} credits have been added to your account!`);
  };

  const calculateTotalCostInCredits = () => {
    const appCredits = COST_MAP_CREDITS[estimatedCost];
    const lessonPlanCredits = requestedMaterials.lessonPlan ? MATERIAL_COST_CREDITS[lessonPlanCost] : 0;
    const handoutCredits = requestedMaterials.handout ? MATERIAL_COST_CREDITS[handoutCost] : 0;
    const quizCredits = requestedMaterials.quiz ? MATERIAL_COST_CREDITS[quizCost] : 0;
    return appCredits + lessonPlanCredits + handoutCredits + quizCredits;
  };

  const handleSubmit = async () => {
    if (isFormDisabled || !appConfig) return;

    const isCreditsEnabled = appConfig.revenueCat?.enabled;

    if (isCreditsEnabled) {
      const totalCost = calculateTotalCostInCredits();
      if (userCredits < totalCost) {
        alert(`You need ${totalCost.toLocaleString()} credits for this, but you only have ${userCredits.toLocaleString()}. Please purchase more credits.`);
        setShowPurchaseModal(true);
        return;
      }
      // Deduct credits and proceed
      setUserCredits(prev => prev - totalCost);
    }
    
    // Proceed with generation (for both credit and non-credit systems)
    await startContentGeneration();
  };

  const handleContentLoadingStateChange = (isLoading: boolean) => {
    setContentLoading(isLoading);
     if (!isLoading) {
        setInputProcessing(false);
    }
  };

  const handleLogin = async () => {
    try {
        const webln = await requestProvider();
        const info = await webln.getInfo();
        if (!info.node.pubkey) {
           throw new Error("Could not retrieve public key from wallet.");
        }
        const pubkey = info.node.pubkey;
        
        setLoggedInUser(pubkey);
        localStorage.setItem('loggedInUserPubKey', pubkey);
        
        // Load or initialize credits for the new user
        const savedCredits = localStorage.getItem(getCreditStorageKey(pubkey));
        if (savedCredits) {
            setUserCredits(parseInt(savedCredits, 10));
        } else {
            // New user bonus
            const newKey = getCreditStorageKey(pubkey);
            localStorage.setItem(newKey, '200');
            setUserCredits(200); 
        }
    } catch (err) {
        console.error("WebLN provider not found or failed:", err);
        // Instead of an alert, show the onboarding modal
        setShowOnboardingModal(true);
    }
  };

  const handleLogout = () => {
    // Save current user's credits before logging out
    const currentKey = getCreditStorageKey(loggedInUser);
    localStorage.setItem(currentKey, String(userCredits));

    setLoggedInUser(null);
    localStorage.removeItem('loggedInUserPubKey');
    
    // Switch to anonymous user credits
    const anonymousKey = getCreditStorageKey(null);
    const savedCredits = localStorage.getItem(anonymousKey);
    setUserCredits(savedCredits ? parseInt(savedCredits, 10) : 200);
  };
  
  const handleCreateHostedWallet = () => {
    const hostedPubKey = `hosted_${uuidv4().slice(0, 12)}`;
    setLoggedInUser(hostedPubKey);
    localStorage.setItem('loggedInUserPubKey', hostedPubKey);
    
    const newKey = getCreditStorageKey(hostedPubKey);
    localStorage.setItem(newKey, '200'); // Give new hosted wallets the starting bonus
    setUserCredits(200);

    setShowOnboardingModal(false);
    alert('A temporary hosted wallet has been created for you! Your session is tied to this browser.');
  };

  const isFormDisabled = inputProcessing || contentLoading;
  const currentVideoUrl = contentBasis?.videoUrl || ''; 

  const handleMaterialRequestChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = event.target;
    setRequestedMaterials(prev => ({ ...prev, [name]: checked }));
  };
  
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContentBasis(null);
    const hasUrl = e.target.value.match(YOUTUBE_URL_REGEX) !== null;
    updateCosts(hasUrl, complexity);
  };
  
  const renderSubmitButton = () => {
    if (!appConfig) {
      return <button className="button-primary submit-button" disabled>Loading Config...</button>;
    }

    if (appConfig.revenueCat?.enabled) {
      const totalCost = calculateTotalCostInCredits();
      const buttonText = `Generate App (${totalCost} Credits)`;
      return (
        <button onClick={handleSubmit} className="button-primary submit-button" disabled={isFormDisabled}>
          {inputProcessing ? 'Processing...' : contentLoading ? 'Generating...' : buttonText}
        </button>
      );
    }
    
    // Default button if credit system is disabled
    return (
      <button onClick={handleSubmit} className="button-primary submit-button" disabled={isFormDisabled}>
        {inputProcessing ? 'Processing...' : contentLoading ? 'Generating...' : 'Generate App'}
      </button>
    );
  };


  return (
    <>
      <div className="app-wrapper">
        <Header 
          siteTitle="Classify"
          subTitle="Turn a topic or video into a Master Class"
          showLlmLogPanel={showLlmLogPanel}
          onToggleLlmLogPanel={handleToggleLlmLogPanel}
          onToggleHowToUse={toggleHowToUseModal}
          config={appConfig}
          revenueCatEnabled={appConfig?.revenueCat?.enabled}
          credits={userCredits}
          onGetCredits={() => setShowPurchaseModal(true)}
          loggedInUser={loggedInUser}
          onLogin={handleLogin}
          onLogout={handleLogout}
        />
        <div className="content-pusher">
          <main className={`main-container ${isOutputExpanded ? 'output-expanded' : ''}`}>
            <div className="left-side">
              <div className="input-section">
                <div className="input-container">
                  <label htmlFor="content-input" className="input-label">
                    Enter YouTube URL, Topic, or App Idea:
                  </label>
                  <textarea
                    ref={contentInputRef}
                    id="content-input"
                    className="content-input"
                    rows={4}
                    placeholder="e.g., 'https://www.youtube.com/watch?v=xyz' or 'Quantum physics for beginners' or combine both!"
                    disabled={isFormDisabled}
                    onKeyDown={handleKeyDown}
                    onChange={handleInputChange}
                  />
                </div>

                <div className="complexity-slider-container">
                    <label htmlFor="complexity-slider">Complexity / Detail Level:</label>
                    <div className="slider-wrapper">
                         <input
                            type="range"
                            id="complexity-slider"
                            min="1"
                            max="3"
                            step="1"
                            value={complexity}
                            onChange={(e) => setComplexity(parseInt(e.target.value, 10))}
                            disabled={isFormDisabled}
                        />
                        <span className="slider-label">{complexityLabels[complexity - 1]}</span>
                    </div>
                </div>

                <div className="educational-materials-request">
                  <h4>Additional Materials (Optional):</h4>
                  <div>
                    <input type="checkbox" id="lessonPlan" name="lessonPlan" className="educational-material-checkbox" onChange={handleMaterialRequestChange} disabled={isFormDisabled} />
                    <label htmlFor="lessonPlan">Lesson Plan</label>
                    <CostIndicator level={lessonPlanCost} />
                  </div>
                  <div>
                    <input type="checkbox" id="handout" name="handout" className="educational-material-checkbox" onChange={handleMaterialRequestChange} disabled={isFormDisabled} />
                    <label htmlFor="handout">Student Handout</label>
                    <CostIndicator level={handoutCost} />
                  </div>
                  <div>
                    <input type="checkbox" id="quiz" name="quiz" className="educational-material-checkbox" onChange={handleMaterialRequestChange} disabled={isFormDisabled} />
                    <label htmlFor="quiz">Review Quiz</label>
                    <CostIndicator level={quizCost} />
                  </div>
                </div>

                <div className="button-container">
                  {renderSubmitButton()}
                  <CostIndicator level={estimatedCost} prefix="Est. App Cost:" />
                </div>
              </div>

              <div className="video-container">
                {currentVideoUrl ? (
                  <iframe
                    className="video-iframe"
                    src={getYoutubeEmbedUrl(currentVideoUrl)}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen></iframe>
                ) : contentBasis?.topicOrDetails && !contentBasis?.videoUrl ? (
                    <div className="video-placeholder">Generating app from topic: "{contentBasis.topicOrDetails.substring(0,60)}{contentBasis.topicOrDetails.length > 60 ? '...' : ''}"</div>
                ) : (
                  <div className="video-placeholder">Video appears here if URL is provided</div>
                )}
              </div>
            </div>

            <div className={`right-side ${showLlmLogPanel ? 'llm-log-visible' : ''}`}>
              {showLlmLogPanel && (
                <LlmLogPanel
                  interactions={llmInteractions}
                  onClearLog={handleClearLlmLog}
                  isOutputExpanded={isOutputExpanded}
                />
              )}
              <div className="content-area-wrapper">
                  <div className="content-area-header">
                    {contentBasis && (
                      <button
                        onClick={handleToggleExpandOutput}
                        className="button-secondary expand-toggle-button"
                        title={isOutputExpanded ? "Collapse Output" : "Expand Output"}
                        aria-pressed={isOutputExpanded}
                      >
                        <span className="material-symbols-outlined">
                          {isOutputExpanded ? 'contract_content' : 'expand_content'}
                        </span>
                      </button>
                    )}
                  </div>
                  <div className="content-area">
                    {contentBasis ? (
                      <ContentContainer
                        key={reloadCounter}
                        contentBasisInput={contentBasis}
                        onLoadingStateChange={handleContentLoadingStateChange}
                        onLlmInteraction={handleLlmInteraction}
                        requestedMaterials={requestedMaterials}
                        ref={contentContainerRef}
                        isOutputExpanded={isOutputExpanded}
                        appConfig={appConfig}
                        userCredits={userCredits}
                        setUserCredits={setUserCredits}
                        setShowPurchaseModal={setShowPurchaseModal}
                      />
                    ) : (
                      <div className="content-placeholder">
                        <h3>Welcome!</h3>
                        <p>
                          This is where your generated learning app will appear.
                        </p>
                        <p>
                          To get started, enter a YouTube URL, a topic, or an app idea in the panel on the left and click "Generate App".
                        </p>
                        <p>
                          You can follow the AI's progress in the "LLM Interaction Log" above.
                        </p>
                      </div>
                    )}
                  </div>
              </div>
            </div>
          </main>
        </div>
        <Footer/>
      </div>
      {showHowToUseModal && (
        <HowToUseModal isOpen={showHowToUseModal} onClose={toggleHowToUseModal} />
      )}
      {showPurchaseModal && (
        <PurchaseCreditsModal
          isOpen={showPurchaseModal}
          onClose={() => setShowPurchaseModal(false)}
          onPurchase={handlePurchaseCredits}
          config={appConfig}
        />
      )}
      {showOnboardingModal && (
        <OnboardingWalletModal
            isOpen={showOnboardingModal}
            onClose={() => setShowOnboardingModal(false)}
            onCreateHosted={handleCreateHostedWallet}
        />
      )}
    </>
  );
}