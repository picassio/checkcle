package main

import (
	"encoding/json"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gorilla/mux"
	"service-operation/config"
	dataretention "service-operation/data-retention"
	"service-operation/handlers"
	"service-operation/monitoring"
	performancemonitoring "service-operation/performance-monitoring"
	"service-operation/pocketbase"
	servermonitoring "service-operation/server-monitoring"
	sslmonitoring "service-operation/ssl-monitoring"
	uptimemonitoring "service-operation/uptime-monitoring"
)

func main() {
	//log.Println("🚀 === STARTING SERVICE OPERATION SERVER ===")
	
	cfg := config.Load()
	//log.Printf("📋 Configuration loaded:")
	//log.Printf("  - Port: %s", cfg.Port)
	//log.Printf("  - Backend PB Enabled: %t", cfg.PocketBaseEnabled)
	if cfg.PocketBaseEnabled {
		//log.Printf("  - PocketBase URL: %s", cfg.PocketBaseURL)
	}
	
	// Initialize PocketBase client (no credentials required)
	var pbClient *pocketbase.PocketBaseClient
	var monitoringService *monitoring.MonitoringService
	var sslMonitoringService *monitoring.SSLMonitoringService
	var sslNotificationService *sslmonitoring.SSLMonitor
	var serverMonitoringService *servermonitoring.ServerMonitoringService
	var uptimeMonitoringService *uptimemonitoring.UptimeMonitor
	var dataRetentionScheduler *dataretention.Scheduler
	var performanceMonitoringService *performancemonitoring.PerformanceMonitor
	
	if cfg.PocketBaseEnabled {
		//log.Println("🔧 Initializing PocketBase client...")
		var err error
		pbClient, err = pocketbase.NewPocketBaseClient(cfg.PocketBaseURL)
		if err != nil {
			//log.Printf("⚠️  WARNING: Failed to initialize PocketBase client: %v", err)
		} else {
			//log.Println("✅ PocketBase client initialized successfully")
			
			//log.Println("🔍 Testing PocketBase connection...")
			if err := pbClient.TestConnection(); err != nil {
				//log.Printf("⚠️  WARNING: PocketBase connection test failed: %v", err)
			} else {
				//log.Println("✅ PocketBase connection test successful")
				
				// Initialize and start service monitoring with regional support
				//log.Println("🔧 Initializing service monitoring...")
				monitoringService = monitoring.NewMonitoringService(pbClient)
				go monitoringService.Start()
				//log.Println("✅ Service monitoring started with regional agent support")
				
				// Initialize and start SSL monitoring service (original)
				//log.Println("🔧 Initializing SSL monitoring (original)...")
				sslMonitoringService = monitoring.NewSSLMonitoringService(pbClient)
				go sslMonitoringService.Start()
				//log.Println("✅ SSL monitoring started (independent of regional agents)")
				
				// Initialize and start SSL notification service (new)
				//log.Println("🔧 Initializing SSL notification monitoring...")
				sslNotificationService = sslmonitoring.NewSSLMonitor(pbClient)
				go sslNotificationService.Start()
				//log.Println("✅ SSL notification monitoring started with Telegram support")
				
				// Initialize and start server monitoring service
				//log.Println("🔧 Initializing server monitoring...")
				serverMonitoringService = servermonitoring.NewServerMonitoringService(pbClient)
				serverMonitoringService.Start()
				//log.Println("✅ Server monitoring started with notification support")
				
				// Initialize and start uptime monitoring service
				//log.Println("🔧 Initializing uptime monitoring...")
				uptimeMonitoringService = uptimemonitoring.NewUptimeMonitor(pbClient)
				go uptimeMonitoringService.Start()
				//log.Println("✅ Uptime monitoring started with notification support")

				// Initialize and start data retention scheduler
				//log.Println("🔧 Initializing data retention scheduler...")
				dataRetentionScheduler = dataretention.NewScheduler(pbClient, 24*time.Hour) // Run daily
				go dataRetentionScheduler.Start()
				//log.Println("✅ Data retention scheduler started (daily cleanup)")

				// Initialize and start performance monitoring service
				//log.Println("🔧 Initializing performance monitoring...")
				performanceMonitoringService = performancemonitoring.NewPerformanceMonitor(pbClient)
				go performanceMonitoringService.Start()
				//log.Println("✅ Performance monitoring started with sitespeed.io support")
			}
		}
	}
	
	//log.Println("🔧 Initializing HTTP handlers...")
	handler := handlers.NewOperationHandler(cfg, pbClient)

	router := mux.NewRouter()

	// CORS middleware
	router.Use(func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// Allow requests from any origin
			w.Header().Set("Access-Control-Allow-Origin", "*")
			w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS, PATCH")
			w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With")
			w.Header().Set("Access-Control-Max-Age", "3600")

			// Handle preflight requests
			if r.Method == "OPTIONS" {
				w.WriteHeader(http.StatusOK)
				return
			}

			next.ServeHTTP(w, r)
		})
	})

	// Main operation endpoint
	router.HandleFunc("/operation", handler.HandleOperation).Methods("POST")
	
	// Quick operation endpoint with query parameters
	router.HandleFunc("/operation/quick", handler.HandleQuickOperation).Methods("GET")
	
	// Legacy ping endpoint for backward compatibility
	router.HandleFunc("/ping", handler.HandleOperation).Methods("POST")
	router.HandleFunc("/ping/quick", handler.HandleQuickOperation).Methods("GET")
	
	// Health check
	router.HandleFunc("/health", handler.HandleHealth).Methods("GET")

	// Performance monitoring endpoints
	router.HandleFunc("/performance/tests", handler.HandlePerformanceTests).Methods("GET", "OPTIONS")
	router.HandleFunc("/performance/test/{testId}", handler.HandlePerformanceTestStatus).Methods("GET", "OPTIONS")
	router.HandleFunc("/performance/metrics/{testId}", handler.HandlePerformanceMetrics).Methods("GET", "OPTIONS")
	router.HandleFunc("/performance/latest", handler.HandlePerformanceLatestMetrics).Methods("GET", "OPTIONS")
	router.HandleFunc("/performance/budgets", handler.HandlePerformanceBudgets).Methods("GET", "OPTIONS")
	router.HandleFunc("/performance/report/{testId}/{timestamp}/{file:.*}", handler.HandlePerformanceReport).Methods("GET", "OPTIONS")
	router.HandleFunc("/performance/report/{testId}/{timestamp}/", handler.HandlePerformanceReport).Methods("GET", "OPTIONS")
	router.HandleFunc("/performance/report/{testId}/{timestamp}", handler.HandlePerformanceReport).Methods("GET", "OPTIONS")

	// Queue endpoints
	router.HandleFunc("/performance/queue", handler.HandlePerformanceQueueStatus).Methods("GET", "OPTIONS")
	router.HandleFunc("/performance/queue/test/{testId}", handler.HandlePerformanceQueuePosition).Methods("GET", "OPTIONS")
	router.HandleFunc("/performance/queue/{itemId}/cancel", handler.HandlePerformanceCancelQueue).Methods("POST", "OPTIONS")

	// Run test endpoint (needs access to performanceMonitoringService)
	// Now adds to queue instead of running directly
	if performanceMonitoringService != nil {
		router.HandleFunc("/performance/test/{testId}/run", func(w http.ResponseWriter, r *http.Request) {
			vars := mux.Vars(r)
			testID := vars["testId"]

			if testID == "" {
				http.Error(w, "Missing testId", http.StatusBadRequest)
				return
			}

			// RunTestNow now returns a queue item instead of metrics
			queueItem, err := performanceMonitoringService.RunTestNow(testID)
			if err != nil {
				if err == performancemonitoring.ErrTestAlreadyQueued {
					http.Error(w, "Test is already queued", http.StatusConflict)
					return
				}
				if err == performancemonitoring.ErrTestAlreadyRunning {
					http.Error(w, "Test is already running", http.StatusConflict)
					return
				}
				http.Error(w, "Failed to queue test: "+err.Error(), http.StatusInternalServerError)
				return
			}

			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(queueItem)
		}).Methods("POST", "OPTIONS")
	}

	log.Printf("=== 🌐 CHECKCLE SERVICE OPERATION SERVER READY ===")
	log.Printf("🚀 Starting on port %s", cfg.Port)
	if pbClient != nil {
		log.Printf("✓Backend integration enabled at %s ", pbClient.GetBaseURL())
	}
	if monitoringService != nil {
		log.Printf("✓Service monitoring enabled with regional agent support")
	}
	if sslMonitoringService != nil {
		//log.Printf("🔒 SSL certificate monitoring enabled (independent)")
	}
	if sslNotificationService != nil {
		log.Printf("✓SSL notification monitoring enabled with Telegram support")
	}
	if serverMonitoringService != nil {
		log.Printf("✓Server monitoring enabled with notification support")
	}
	if uptimeMonitoringService != nil {
		log.Printf("✓Uptime monitoring enabled with notification support")
	}
	log.Printf("✓Supported operations: ping, dns, tcp, http, ssl")
	if dataRetentionScheduler != nil {
		log.Printf("✓Data retention scheduler enabled (daily cleanup)")
	}
	if performanceMonitoringService != nil {
		log.Printf("✓Performance monitoring enabled with sitespeed.io support")
	}
	

	// Setup graceful shutdown
	c := make(chan os.Signal, 1)
	signal.Notify(c, os.Interrupt, syscall.SIGTERM)
	
	go func() {
		<-c
		log.Println("🛑 === GRACEFUL SHUTDOWN INITIATED ===")
		log.Println("🛑 Shutting down monitoring services...")
		
		if monitoringService != nil {
			log.Println("🛑 Stopping service monitoring...")
			monitoringService.Stop()
		}
		if sslMonitoringService != nil {
			log.Println("🛑 Stopping SSL monitoring...")
			sslMonitoringService.Stop()
		}
		if sslNotificationService != nil {
			log.Println("🛑 Stopping SSL notification monitoring...")
			sslNotificationService.Stop()
		}
		if serverMonitoringService != nil {
			log.Println("🛑 Stopping server monitoring...")
			serverMonitoringService.Stop()
		}
		if uptimeMonitoringService != nil {
			log.Println("🛑 Stopping uptime monitoring...")
			uptimeMonitoringService.Stop()
		}
		if dataRetentionScheduler != nil {
			log.Println("🛑 Stopping data retention scheduler...")
			dataRetentionScheduler.Stop()
		}
		if performanceMonitoringService != nil {
			log.Println("🛑 Stopping performance monitoring...")
			performanceMonitoringService.Stop()
		}

		log.Println("✅ All services stopped gracefully")
		log.Println("🛑 === SERVICE OPERATION SERVER STOPPED ===")
		os.Exit(0)
	}()

	//log.Println("🌐 HTTP server starting...")
	if err := http.ListenAndServe(":"+cfg.Port, router); err != nil {
		log.Fatal("❌ FATAL: Failed to start HTTP server:", err)
	}
}