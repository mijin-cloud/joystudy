import React, { useState, useRef, useEffect } from 'react';
import { Upload, BookOpen, FileText, BarChart3, RotateCcw, Volume2, Check, X } from 'lucide-react';
import * as XLSX from 'xlsx';
import { getFirestore, doc, setDoc, getDoc } from "firebase/firestore";
import { initializeApp } from 'firebase/app';
import firebaseConfig from './firebaseConfig'; 
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';

// Firebase 초기화
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);

const saveSpreadsheetDataToFirestore = async (data, user, sheetName) => {
  try {
    const groupedBySet = data.reduce((acc, item) => {
      if (!acc[item.set]) acc[item.set] = [];
      acc[item.set].push({ question: item.question, answer: item.answer });
      return acc;
    }, {});

    for (const setName in groupedBySet) {
      const setRef = doc(db, 'users', user, 'sheets', sheetName, 'sets', setName);
      await setDoc(setRef, { 
        items: groupedBySet[setName],
        lastUpdated: new Date(),
        source: 'spreadsheet'
      });
    }
    
    console.log(`${user}의 ${sheetName} 시트 데이터가 Firestore에 저장되었습니다.`);
  } catch (error) {
    console.error('Firestore 저장 오류:', error);
  }
};

  // 버튼 스타일 컴포넌트
  const StyledButton = ({ children, onClick, className = '', disabled = false }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        relative overflow-hidden bg-white text-purple-700 font-semibold py-2 px-6 rounded-lg
        border-2 border-purple-300 transition-all duration-300 hover:bg-purple-50
        before:absolute before:top-0 before:left-0 before:w-0 before:h-full 
        before:bg-purple-100 before:transition-all before:duration-300
        hover:before:w-full before:z-0
        disabled:opacity-50 disabled:cursor-not-allowed
        ${className}
      `}
    >
      <span className="relative z-10">{children}</span>
    </button>
  );

const JoyStudyApp = () => {
  const [studyData, setStudyData] = useState([]);
  const [sheetList, setSheetList] = useState([]); // 자동으로 불러온 시트 이름 목록
const initialUsers = {
  hoo: '10OqBEmzpjamtSBEiBxfua04Z103l0AFrm4zBE1BJ-tA',
  un: '1PCexbIAT1kBQiGlNIN0zzGDwUTVkZrO-7LutKuNhET4',
  지민: '1bS1VXxtA7rv-zQAixdiDK47iSHQei1zIe42-kG1PdUw'
};

const [users, setUsers] = useState(initialUsers);
const [userList, setUserList] = useState(Object.keys(initialUsers));
const [selectedUser, setSelectedUser] = useState(Object.keys(initialUsers)[0] || ''); // 첫 번째 사용자를 기본값으로
const [selectedSheet, setSelectedSheet] = useState('영단어'); // 기본 탭 이름
  const [selectedSet, setSelectedSet] = useState('');
  const [activeTab, setActiveTab] = useState('upload');
  const [testStats, setTestStats] = useState({});
  const [wrongAnswers, setWrongAnswers] = useState({});
  const [justClearedWrongAnswers, setJustClearedWrongAnswers] = useState(false);
  const [currentTest, setCurrentTest] = useState(null);
  const [wasWrongAnswerTest, setWasWrongAnswerTest] = useState(false);
  const [testResults, setTestResults] = useState([]);
  const [showResults, setShowResults] = useState(false);
  const [statImages, setStatImages] = useState({});
  const [isLoading, setIsLoading] = useState(false);
 const [speechRate, setSpeechRate] = useState(0.9); // 기본 속도 0.9  
const [isSubjectiveTest, setIsSubjectiveTest] = useState(false);
const [subjectiveAnswer, setSubjectiveAnswer] = useState('');
const [isOnline, setIsOnline] = useState(navigator.onLine);
const [dataSource, setDataSource] = useState('auto'); // 'auto' | 'sheet' | 'excel'
const fileInputRef = useRef(null);
const imageInputRef = useRef(null);

 const loadStatImages = async () => {
  try {
    const imageKeys = [];
    // 모든 사용자와 테스트 횟수 조합 생성
    for (const user of userList) {
      for (let i = 1; i <= 5; i++) {
        imageKeys.push(`${user}_test${i}`);
      }
    }
    
    const loadedImages = {};
    for (const key of imageKeys) {
      try {
        const imageDoc = doc(db, 'stat-images', key);
        const docSnap = await getDoc(imageDoc);
        if (docSnap.exists()) {
          loadedImages[key] = docSnap.data().url;
        }
      } catch (error) {
        console.log(`이미지 ${key} 로딩 실패 (없거나 오류):`, error);
      }
    }
    
    setStatImages(loadedImages);
  } catch (error) {
    console.error('통계 이미지 로딩 오류:', error);
  }
}; 

// 초기 사용자 자동 설정
useEffect(() => {
  if (!selectedUser && userList.length > 0) {
    const savedUser = localStorage.getItem('lastUser');
    if (savedUser && userList.includes(savedUser)) {
      setSelectedUser(savedUser);
    } else {
      setSelectedUser(userList[0]);
    }
  }

  if (userList.length > 0) {
    loadStatImages();
  }
}, [userList, selectedUser, loadStatImages]); 

// 시트 목록 자동 로딩
useEffect(() => {
  const sheetID = users[selectedUser];
  if (!sheetID) return;

  const API_KEY = process.env.REACT_APP_GOOGLE_API_KEY;  // ✅ .env에서 불러오기
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetID}?fields=sheets.properties.title&key=${API_KEY}`;

  fetch(url)
    .then(res => {
      if (!res.ok) throw new Error('시트 목록 불러오기 실패');
      return res.json();
    })
    .then(data => {
      const sheetTitles = data.sheets.map(sheet => sheet.properties.title);
      setSheetList(sheetTitles);
      if (sheetTitles.length > 0) {
        setSelectedSheet(sheetTitles[0]);
      }
    })
    .catch(err => {
      console.error('시트 목록 오류:', err);
      setSheetList([]);
    });
}, [selectedUser]);

// 사용자별 기록 불러오기
useEffect(() => {
  const savedWrong = JSON.parse(localStorage.getItem(`${selectedUser}_wrongAnswers`) || '{}');
  const savedStats = JSON.parse(localStorage.getItem(`${selectedUser}_testStats`) || '{}');
  setWrongAnswers(savedWrong);
  setTestStats(savedStats);
}, [selectedUser]);


// 사용자별 오답 저장
useEffect(() => {
  localStorage.setItem(`${selectedUser}_wrongAnswers`, JSON.stringify(wrongAnswers));
}, [wrongAnswers, selectedUser]);

// 사용자별 통계 저장
useEffect(() => {
  localStorage.setItem(`${selectedUser}_testStats`, JSON.stringify(testStats));
}, [testStats, selectedUser]);


useEffect(() => {
  localStorage.setItem('lastUser', selectedUser);
}, [selectedUser]);

useEffect(() => {
  const handleMessage = (event) => {
    if (event.data.type === 'BACK_TO_STUDY') {
      setActiveTab('test'); // 또는 원하는 탭으로 이동
    }
  };
  
  window.addEventListener('message', handleMessage);
  return () => window.removeEventListener('message', handleMessage);
}, []);

useEffect(() => {
  const sheetID = users[selectedUser];
  if (!sheetID || !selectedSheet || !selectedUser) {
    console.log('로딩 조건 미충족:', { sheetID, selectedSheet, selectedUser });
    return;
  }

  setIsLoading(true);
  console.log(`${selectedUser}의 시트 '${selectedSheet}' 로딩 시작...`);

  

  const encodedSheetName = encodeURIComponent(selectedSheet);
  const url = `https://docs.google.com/spreadsheets/d/${sheetID}/gviz/tq?tqx=out:json&sheet=${encodedSheetName}&headers=1`;

  fetch(url)
    .then(res => {
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }
      return res.text();
    })
    .then(data => {
      try {
        const json = JSON.parse(data.substr(47).slice(0, -2));
        const rows = json.table.rows;

        const processedData = rows
          .map(row => row.c)
          .filter(cells => {
            const getVal = (cell, colIndex) => {
              if (!cell) return '';
              let value = cell.formattedValue ?? cell.f ?? cell.v ?? '';
              value = value.toString().trim();
              value = value.replace(/\\u([0-9a-fA-F]{4})/g, (_, code) => String.fromCharCode(parseInt(code, 16)));
              value = value.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
              return value;
            };

            const val1 = getVal(cells?.[0], 0);
            const val2 = getVal(cells?.[1], 1);
            const val3 = getVal(cells?.[2], 2);

            return cells && cells.length >= 3 && val1 && val2 && val3;
          })
          .map(cells => {
            const getValue = (cell) => {
              if (!cell || cell.v == null) return '';
              let value = cell.v.toString().trim();
              if (cell.f && cell.f !== cell.v) value = cell.f.toString().trim();
              value = value.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
              return value;
            };

            return {
              set: getValue(cells[0]),
              question: getValue(cells[1]),
              answer: getValue(cells[2])
            };
          })
          .filter(item => item.set && item.question && item.answer);

        setStudyData(processedData);

       // Firestore에도 저장
if (processedData.length > 0) {
  saveSpreadsheetDataToFirestore(processedData, selectedUser, selectedSheet);
}

if (processedData.length > 0) {
  setSelectedSet(processedData[0].set);
} else {
  setSelectedSet('');
}

        if (processedData.length > 0) {
          setSelectedSet(processedData[0].set);
        } else {
          setSelectedSet('');
        }
      } catch (err) {
        console.error('JSON 파싱 오류:', err);
      }
    })
    .catch(err => {
      console.error('스프레드시트 로딩 오류:', err);
    })
    .finally(() => {
      setIsLoading(false);
    });
}, [selectedUser, selectedSheet, users]);

useEffect(() => {
  const handleOnline = () => setIsOnline(true);
  const handleOffline = () => setIsOnline(false);

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
}, []);

  // 파일 업로드 처리
const handleFileUpload = async (event) => {
  const file = event.target.files[0];
  if (!file) return;

  const fileName = file.name.toLowerCase();
  const userFromFile = fileName.split('_')[0];
  setSelectedUser(userFromFile); // 자동 사용자 설정

  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      const processedData = jsonData
        .filter(row => row.length >= 3 && row[0] && row[1] && row[2])
        .map(row => ({
          set: String(row[0]).trim(),
          question: String(row[1]).trim(),
          answer: String(row[2]).trim()
        }));

      setStudyData(prev => [...prev, ...processedData]);

    // ✅ Firestore 저장
const groupedBySet = processedData.reduce((acc, item) => {
  if (!acc[item.set]) acc[item.set] = [];
  acc[item.set].push({ question: item.question, answer: item.answer });
  return acc;
}, {});

for (const setName in groupedBySet) {
  const setRef = doc(db, 'users', userFromFile, 'sheets', 'uploaded', 'sets', setName);
  await setDoc(setRef, { 
    items: groupedBySet[setName],
    lastUpdated: new Date(),
    source: 'excel'
  });
}

      if (processedData.length > 0) {
        setSelectedSet(processedData[0].set);
      }

      alert(`${userFromFile}의 데이터 ${processedData.length}개가 업로드되고 Firestore에 저장되었습니다.`);
    } catch (error) {
      alert('파일 읽기 중 오류가 발생했습니다.');
      console.error(error);
    }
  };

  reader.readAsArrayBuffer(file);
};

  

  // 이미지 업로드 처리
const handleImageUpload = async (event) => {
  const files = Array.from(event.target.files);
  
  for (const file of files) {
    const fileName = file.name.toLowerCase();
    if (fileName.includes('test') && (fileName.includes('1') || fileName.includes('2') || fileName.includes('3') || fileName.includes('4') || fileName.includes('5'))) {
      
      const match = fileName.match(/([a-zA-Z0-9]+)_test([1-5])/);
      if (match) {
        const user = match[1];
        const count = match[2];
        const imageKey = `${user}_test${count}`;
        
        try {
          // Firebase Storage에 이미지 업로드
          const storageRef = ref(storage, `stat-images/${imageKey}.png`);
          await uploadBytes(storageRef, file);
          const downloadURL = await getDownloadURL(storageRef);
          
          // Firestore에 이미지 URL 저장
          const imageDoc = doc(db, 'stat-images', imageKey);
          await setDoc(imageDoc, { 
            url: downloadURL,
            uploadedAt: new Date(),
            user: user,
            testCount: count
          });
          
          // 로컬 state 업데이트
          setStatImages(prev => ({
            ...prev,
            [imageKey]: downloadURL
          }));
          
          console.log(`이미지 ${imageKey} 업로드 완료`);
        } catch (error) {
          console.error(`이미지 ${imageKey} 업로드 실패:`, error);
        }
      }
    }
  }
  
  alert('이미지 업로드가 완료되었습니다.');
};

  // 세트별 데이터 가져오기
  const getSetData = (setName) => {
    return studyData.filter(item => item.set === setName);
  };

  // 세트 목록 가져오기
  const getSets = () => {
  const sets = studyData.map(item => item.set);
  return [...new Set(sets)].sort();
};

 // 음성 재생 (영어 부분만 재생, 학습용은 괄호에 답 삽입)
const speakText = (text, answer = null) => {
  if ('speechSynthesis' in window) {
    let textToSpeak = text;
    
    // 학습용으로 답이 제공된 경우 모든 괄호 안에 답을 삽입
    if (answer) {
      textToSpeak = text.replace(/\([^)]*\)/g, `${answer}`);
    }
    
    // 영어 부분만 추출하는 정규식
    const englishRegex = /[a-zA-Z][a-zA-Z\s.,!?'"-()]*[a-zA-Z]/g;
    const englishMatches = textToSpeak.match(englishRegex) || [];
    
    // 영어 부분이 있으면 영어로만 재생
    if (englishMatches.length > 0) {
      const englishText = englishMatches.join(' ').trim();
      if (englishText) {
        const englishUtterance = new SpeechSynthesisUtterance(englishText);
        englishUtterance.lang = 'en-US';
        englishUtterance.rate = speechRate; // 상태값 사용
        speechSynthesis.speak(englishUtterance);
      }
    }
  }
};
  // 테스트 시작
 const startTest = (isWrongAnswerTest = false, isSubjective = false) => {
  let questions;

  if (isWrongAnswerTest) {
    const wrongData = wrongAnswers[selectedSet] || [];
    questions = wrongData.map(item => ({
  ...item,
  choices: generateChoices(item, getSetData(selectedSet))
}));

  } else {
    const setData = getSetData(selectedSet);
    questions = setData.map(item => ({
  ...item,
  choices: generateChoices(item, setData)
}));

  }

  setCurrentTest({ questions, isWrongAnswerTest, currentIndex: 0, userAnswers: [] });
  setIsSubjectiveTest(isSubjective);   // 추가
  setSubjectiveAnswer('');             // 추가
  setShowResults(false);
};



  // 선택지 생성
  const generateChoices = (correctItem, allData) => {
    const choices = [correctItem.answer];
    const otherAnswers = allData
      .filter(item => item.answer !== correctItem.answer)
      .map(item => item.answer);
    
    while (choices.length < 4 && otherAnswers.length > 0) {
      const randomIndex = Math.floor(Math.random() * otherAnswers.length);
      const randomAnswer = otherAnswers[randomIndex];
      if (!choices.includes(randomAnswer)) {
        choices.push(randomAnswer);
      }
      otherAnswers.splice(randomIndex, 1);
    }
    
    return choices.sort(() => Math.random() - 0.5);
  };

  // 답안 제출
  const submitAnswer = (selectedAnswer) => {
    const currentQuestion = currentTest.questions[currentTest.currentIndex];
    const isCorrect = selectedAnswer.trim().toLowerCase() === currentQuestion.answer.trim().toLowerCase();
    
    const newUserAnswers = [...currentTest.userAnswers, {
      question: currentQuestion.question,
      answer: currentQuestion.answer,
      userAnswer: selectedAnswer,
      correct: isCorrect
    }];
    
    if (currentTest.currentIndex < currentTest.questions.length - 1) {
      setCurrentTest(prev => ({
        ...prev,
        currentIndex: prev.currentIndex + 1,
        userAnswers: newUserAnswers
      }));
    } else {
      // 테스트 완료
      finishTest(newUserAnswers);
    }
  };

  // 테스트 완료 처리
  const finishTest = (answers) => {
    const wrongResults = answers.filter(item => !item.correct);
    setWasWrongAnswerTest(currentTest?.isWrongAnswerTest || false);
    
    // 통계 업데이트
    setTestStats(prev => ({
      ...prev,
      [selectedSet]: (prev[selectedSet] || 0) + 1
    }));
    
    if (currentTest.isWrongAnswerTest) {
  if (wrongResults.length === 0) {
    // ✅ 오답 목록 제거 + 표시 플래그 설정
    setWrongAnswers(prev => ({
      ...prev,
      [selectedSet]: []
    }));
    setJustClearedWrongAnswers(true); 
  } else {
    setWrongAnswers(prev => ({
      ...prev,
      [selectedSet]: wrongResults
    }));
    setJustClearedWrongAnswers(false);
  }
} else {
  if (wrongResults.length > 0) {
    setWrongAnswers(prev => ({
      ...prev,
      [selectedSet]: wrongResults
    }));
  }
  setJustClearedWrongAnswers(false);
}

    
    setTestResults(answers);
    setCurrentTest(null);
    setShowResults(true);
  };

  // 통계 이미지 가져오기
 const getStatImage = (count) => {
  const key = `${selectedUser}_test${count}`;
  console.log('Finding image with key:', key, 'Available keys:', Object.keys(statImages));
  return statImages[key] || null;
};

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#eed7fd' }}>
      {/* 헤더 */}
<header className="bg-white shadow-md p-4">
  <div className="max-w-6xl mx-auto">
    {/* 타이틀 */}
    <h1 className="text-3xl font-bold text-purple-700 mb-6 text-center sm:text-left">Joy Study</h1>


<div className="mb-4">
  <strong>📡 현재 모드:</strong>{' '}
  {isOnline ? '온라인' : '오프라인'} / 데이터 소스: {dataSource === 'auto' ? (isOnline ? '스프레드시트' : '엑셀') : dataSource}

  <div className="mt-2">
    <label>데이터 소스 선택: </label>
    <select
      value={dataSource}
      onChange={(e) => setDataSource(e.target.value)}
      className="ml-2 border rounded px-2 py-1"
    >
      <option value="auto">자동 (권장)</option>
      <option value="sheet">Google 시트</option>
      <option value="excel">엑셀 업로드</option>
    </select>
  </div>
</div>



{/* 사용자 선택 및 시트 설정 */}
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
    {/* 사용자 선택 */}
    <div className="flex flex-col">
      <label className="text-purple-700 font-medium mb-2">사용자 선택:</label>
      <select
        value={selectedUser}
        onChange={(e) => setSelectedUser(e.target.value)}
        className="p-2 border border-purple-300 rounded-lg bg-white text-purple-700"
      >
        {userList.map(user => (
          <option key={user} value={user}>{user}</option>
        ))}
      </select>
    </div>

    {/* 시트 선택 */}
    <div className="flex flex-col">
      <label className="text-purple-700 font-medium mb-2">시트 이름:</label>
      <select
        value={selectedSheet}
        onChange={(e) => setSelectedSheet(e.target.value)}
        className="p-2 border border-purple-300 rounded-lg bg-white text-purple-700"
      >
        {sheetList.map((name) => (
          <option key={name} value={name}>{name}</option>
        ))}
      </select>
    </div>
  </div>



    {/* 음성 속도 조절 */}
<div className="mb-4 p-4 bg-gray-50 rounded-lg">
  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
    <label className="text-purple-700 font-medium whitespace-nowrap">음성 속도:</label>
    <div className="flex items-center gap-4 w-full sm:w-auto">
      <input
        type="range"
        min="0.3"
        max="1"
        step="0.2"
        value={speechRate}
        onChange={(e) => setSpeechRate(parseFloat(e.target.value))}
        className="flex-1 sm:w-32"
      />
      <span className="text-purple-700 font-medium min-w-[60px]">
        {speechRate === 1 ? '정상' : 
         speechRate === 0.7 ? '조금 느림' : 
         speechRate === 0.5 ? '느림' : 
         speechRate === 0.3 ? '매우 느림' : `${speechRate}x`}
      </span>
    </div>
  </div>
</div>
          
          {/* 네비게이션 메뉴 */}
  <nav className="mb-4">
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
        <StyledButton 
          onClick={() => setActiveTab('upload')}
          className={`text-sm ${activeTab === 'upload' ? 'bg-purple-100' : ''}`}
        >
          <Upload className="w-4 h-4 mr-1 inline" />
          <span className="hidden sm:inline">파일 업로드</span>
          <span className="sm:hidden">업로드</span>
        </StyledButton>
        
        <StyledButton 
          onClick={() => setActiveTab('data')}
          className={`text-sm ${activeTab === 'data' ? 'bg-purple-100' : ''}`}
          disabled={!selectedSet}
        >
          <BookOpen className="w-4 h-4 mr-1 inline" />
          <span className="hidden sm:inline">학습데이터</span>
          <span className="sm:hidden">학습</span>
        </StyledButton>
        
        <StyledButton 
          onClick={() => setActiveTab('test')}
          className={`text-sm ${activeTab === 'test' ? 'bg-purple-100' : ''}`}
          disabled={!selectedSet}
        >
          <FileText className="w-4 h-4 mr-1 inline" />
          테스트
        </StyledButton>
        
       <StyledButton
          onClick={() => {
            if (!selectedUser || !selectedSet) {
            alert('사용자와 세트를 모두 선택하세요.');
            return;
           }

    const setData = getSetData(selectedSet);
    if (setData.length === 0) {
      alert('선택한 세트에 단어가 없습니다.');
      return;
    }

   const wordData = getSetData(selectedSet);
if (wordData.length === 0) {
  alert('선택한 세트에 단어가 없습니다.');
  return;
}
const gameData = {
  currentSet: selectedSet,
  wordData,
  selectedUser,
};
console.log("게임 데이터 저장됨:", gameData);
localStorage.setItem("gameData", JSON.stringify(gameData));
window.location.href = "/game/game.html";


  }}
  className="ml-2 bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded"
>
  🎮 게임 시작
</StyledButton>

        <StyledButton 
          onClick={() => setActiveTab('stats')}
          className={`text-sm ${activeTab === 'stats' ? 'bg-purple-100' : ''}`}
          disabled={!selectedSet}
        >
          <BarChart3 className="w-4 h-4 mr-1 inline" />
          통계
        </StyledButton>
        
        <StyledButton 
          onClick={() => setActiveTab('review')}
          className={`text-sm ${activeTab === 'review' ? 'bg-purple-100' : ''}`}
          disabled={!selectedSet || !wrongAnswers[selectedSet]?.length}
        >
          <RotateCcw className="w-4 h-4 mr-1 inline" />
          <span className="hidden sm:inline">오답복습</span>
          <span className="sm:hidden">복습</span>
        </StyledButton>
      </div>
    </nav>
        
        {/* 세트 selector */}
   
  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
    <label className="text-purple-700 font-medium whitespace-nowrap">세트 선택:</label>
    <select 
      value={selectedSet}
      onChange={(e) => setSelectedSet(e.target.value)}
      className="w-full sm:w-auto p-2 border border-purple-300 rounded-lg bg-white text-purple-700"
    >
      {getSets().map(set => (
        <option key={set} value={set}>{set}</option>
      ))}
    </select>
    {isLoading && (
      <span className="text-sm text-gray-500">데이터 로딩 중...</span>
    )}
  </div>



{/* 데이터가 없을 때 표시할 메시지 */}
{!isLoading && studyData.length === 0 && selectedUser && selectedSheet && (
  <div className="text-center py-4">
    <p className="text-gray-500">
      '{selectedUser}'의 '{selectedSheet}' 시트에서 데이터를 불러올 수 없습니다.
    </p>
    <p className="text-sm text-gray-400 mt-1">
      시트 공유 설정이나 시트 이름을 확인해주세요.
    </p>
  </div>
)}
  </div>
</header>

      {/* 메인 콘텐츠 */}
      <main className="max-w-6xl mx-auto p-4">
        {/* 파일 업로드 탭 */}
        {activeTab === 'upload' && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-bold text-purple-700 mb-4">학습 데이터 업로드</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-gray-700 mb-2">엑셀 파일 업로드 (1열: 세트명, 2열: 문제, 3열: 답)</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileUpload}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100"
                />
              </div>
              
              <div>
                <label className="block text-gray-700 mb-2">통계 이미지 업로드 (test1.png ~ test5.png)</label>
<p className="text-sm text-gray-500 mt-1">
  ※ 사용자별 통계 이미지를 등록하려면 파일 이름을 다음과 같이 지정해 주세요:<br />
  <code>user1_test1.png</code>, <code>user2_test3.png</code>, <code>user3_test5.png</code><br />
  (형식: <code>사용자명_test횟수</code>)
</p>
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageUpload}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100"
                />
              </div>
            </div>
          </div>
        )}

        {/* 학습데이터 탭 */}
        {activeTab === 'data' && selectedSet && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-bold text-purple-700 mb-4">학습 데이터 - {selectedSet}</h2>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-300">
                <thead>
                  <tr className="bg-purple-100">
                    <th className="border border-gray-300 p-2">번호</th>
                    <th className="border border-gray-300 p-2">문제</th>
                    <th className="border border-gray-300 p-2">답</th>
                  </tr>
                </thead>
                <tbody>
                  {getSetData(selectedSet).map((item, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="border border-gray-300 p-2 text-center">{index + 1}</td>
                      <td className="border border-gray-300 p-2">
                        {item.question}
                        <button
                          onClick={() => speakText(item.question, item.answer)}
                          className="ml-2 text-purple-600 hover:text-purple-800"
                        >
                          <Volume2 className="w-3 h-3" />
                        </button>
                      </td>
                      <td className="border border-gray-300 p-2">{item.answer}</td>
                    
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 테스트 탭 */}
        {activeTab === 'test' && selectedSet && (
          <div className="bg-white rounded-lg shadow-md p-6">
            {!currentTest && !showResults && (
              <div>
                <h2 className="text-2xl font-bold text-purple-700 mb-4">테스트 - {selectedSet}</h2>
                <StyledButton onClick={() => startTest(false, false)}>
  객관식 테스트 시작
</StyledButton>

<StyledButton onClick={() => startTest(false, true)} className="ml-2">
  주관식 테스트 시작
</StyledButton>

              </div>
            )}
            
            {currentTest && (
              <div>
                <div className="mb-4">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="text-xl font-semibold">
                      문제 {currentTest.currentIndex + 1} / {currentTest.questions.length}
                    </h3>
                    <div className="w-full bg-gray-200 rounded-full h-2 ml-4">
                      <div 
                        className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${((currentTest.currentIndex + 1) / currentTest.questions.length) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
                
                <div className="mb-6">
                  <h4 className="text-lg font-medium mb-4" dangerouslySetInnerHTML={{
  __html: currentTest.questions[currentTest.currentIndex].question.replace(/\n/g, '<br/>')
}} />

                  
                  {isSubjectiveTest ? (
  <div className="mb-4">
    <input
      type="text"
      value={subjectiveAnswer}
      onChange={(e) => setSubjectiveAnswer(e.target.value)}
      placeholder="정답을 입력하세요"
      className="w-full p-3 border border-purple-300 rounded"
    />
    <StyledButton
      onClick={() => {
        submitAnswer(subjectiveAnswer.trim());
        setSubjectiveAnswer('');
      }}
      className="mt-2"
    >
      제출
    </StyledButton>
  </div>
) : (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
    {currentTest.questions[currentTest.currentIndex].choices.map((choice, index) => (
      <StyledButton
        key={index}
        onClick={() => submitAnswer(choice)}
        className="text-left p-4 hover:bg-purple-50"
      >
        {choice}
      </StyledButton>
    ))}
  </div>
)}
                </div>
              </div>
            )}
            
            {showResults && (
              <div>
                <h2 className="text-2xl font-bold text-purple-700 mb-4">테스트 결과</h2>
                <div className="mb-4">
                  <p className="text-lg">
                    총 {testResults.length}문제 중 {testResults.filter(r => r.correct).length}문제 정답
                    <span className="ml-2 text-green-600 font-semibold">
                      ({Math.round(testResults.filter(r => r.correct).length / testResults.length * 100)}%)
                    </span>
                  </p>
                </div>
                
                <div className="space-y-3">
                  {testResults.map((result, index) => (
                    <div key={index} className={`p-3 rounded-lg border ${result.correct ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                      <div className="flex items-center mb-2">
                        {result.correct ? 
                          <Check className="w-5 h-5 text-green-600 mr-2" /> : 
                          <X className="w-5 h-5 text-red-600 mr-2" />
                        }
                        <span className="font-medium">{result.question}</span>
                      </div>
                      <p className="text-sm text-gray-600">
                        정답: {result.answer} | 입력: {result.userAnswer}
                      </p>
                    </div>
                  ))}
                </div>
                
                <div className="mt-6">
                  <StyledButton onClick={() => setShowResults(false)}>
                    다시 테스트
                  </StyledButton>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 통계 탭 */}
        {activeTab === 'stats' && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-bold text-purple-700 mb-4">테스트 통계</h2>
            <div className="space-y-4">
              {getSets().map(set => {
                const count = testStats[set] || 0;
                const maxCount = Math.min(count, 5);
                return (
                  <div key={set} className="flex items-center space-x-4">
                    <div className="w-20 text-sm font-medium">{set}</div>
                    <div className="flex-1 bg-gray-200 rounded-full h-6 relative">
                      <div 
                        className="bg-purple-600 h-6 rounded-full transition-all duration-300"
                        style={{ width: `${(maxCount / 5) * 100}%` }}
                      ></div>
                      <span className="absolute inset-0 flex items-center justify-center text-xs font-medium text-white">
                        {count}/5
                      </span>
                    </div>
                    {maxCount > 0 && getStatImage(maxCount) && (
                      <img 
                        src={getStatImage(maxCount)} 
                        alt={`test${maxCount}`}
                        className="h-24 w-auto"
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 오답복습 탭 */}
        {activeTab === 'review' && selectedSet && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-bold text-purple-700 mb-4">오답 복습 - {selectedSet}</h2>
            
            {!currentTest && !showResults && (
              <div>
                <div className="mb-4">
                  <h3 className="text-lg font-semibold mb-2">오답 목록</h3>
                  <div className="space-y-2">
                    {wrongAnswers[selectedSet].map((item, index) => (
                      <div key={index} className="p-3 bg-red-50 border border-red-200 rounded-lg">
                        <p><strong>문제:</strong> {item.question}</p>
                        <p><strong>정답:</strong> {item.answer}</p>
                        <p><strong>입력한 답:</strong> {item.userAnswer}</p>
                      </div>
                    ))}
                  </div>
                </div>
                
                <StyledButton onClick={() => startTest(true)}>
                  오답 테스트 시작
                </StyledButton>
              </div>
            )}
            
            {/* 테스트 진행 중이면 테스트 UI 표시 (위의 테스트 탭과 동일) */}
            {currentTest && (
              <div>
                <div className="mb-4">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="text-xl font-semibold">
                      오답 문제 {currentTest.currentIndex + 1} / {currentTest.questions.length}
                    </h3>
                    <div className="w-full bg-gray-200 rounded-full h-2 ml-4">
                      <div 
                        className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${((currentTest.currentIndex + 1) / currentTest.questions.length) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
                
                <div className="mb-6">
                  <h4 className="text-lg font-medium mb-4">
                    {currentTest.questions[currentTest.currentIndex].question}
                  </h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {currentTest.questions[currentTest.currentIndex].choices.map((choice, index) => (
                      <StyledButton
                        key={index}
                        onClick={() => submitAnswer(choice)}
                        className="text-left p-4 hover:bg-purple-50"
                      >
                        {choice}
                      </StyledButton>
                    ))}
                  </div>
                </div>
              </div>
            )}
            
            {showResults && (
              <div>
                <h2 className="text-2xl font-bold text-purple-700 mb-4">오답 테스트 결과</h2>
                <div className="mb-4">
                  <p className="text-lg">
                    총 {testResults.length}문제 중 {testResults.filter(r => r.correct).length}문제 정답
                    <span className="ml-2 text-green-600 font-semibold">
                      ({Math.round(testResults.filter(r => r.correct).length / testResults.length * 100)}%)
                    </span>
                  </p>
                  {activeTab === 'review' && showResults && wasWrongAnswerTest && justClearedWrongAnswers && (
  <p className="text-green-600 font-semibold mt-2">
    🎉 모든 문제를 맞혔습니다! 오답 목록에서 제거됩니다.
  </p>
)}
                </div>
                
                <div className="space-y-3">
                  {testResults.map((result, index) => (
                    <div key={index} className={`p-3 rounded-lg border ${result.correct ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                      <div className="flex items-center mb-2">
                        {result.correct ? 
                          <Check className="w-5 h-5 text-green-600 mr-2" /> : 
                          <X className="w-5 h-5 text-red-600 mr-2" />
                        }
                        <span className="font-medium">{result.question}</span>
                      </div>
                      <p className="text-sm text-gray-600">
                        정답: {result.answer} | 입력: {result.userAnswer}
                      </p>
                    </div>
                  ))}
                </div>
                
                <div className="mt-6">
                  <StyledButton onClick={() => setShowResults(false)}>
                    다시 테스트
                  </StyledButton>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};
export default JoyStudyApp;